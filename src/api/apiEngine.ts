import { Provider, Message } from '../types/index.js';
import { eventBus } from '../core/events.js';

export interface ChatRequestOptions {
  provider: Provider;
  model: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  signal?: AbortSignal;
  stream?: boolean;
}

export interface ChatResponse {
  content: string | null;
  reasoning_content?: string | null;
  tool_calls?: any[];
}

export class ApiEngine {
  /**
   * Tests the connection to a provider's base URL and API key
   */
  static async testConnection(baseUrl: string, apiKey: string): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    try {
      const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${cleanUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        return { success: true, latency };
      } else {
        const errorText = await response.text();
        return { success: false, latency, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (err: any) {
      const latency = Date.now() - startTime;
      return { success: false, latency, error: err.message || 'Unknown network error' };
    }
  }

  /**
   * Sends a chat request to the provider (streaming or non-streaming).
   */
  static async chatCompletion(options: ChatRequestOptions): Promise<ChatResponse> {
    const { provider, model, messages, systemPrompt, temperature, maxTokens, tools, signal, stream = true } = options;
    
    const cleanUrl = provider.base_url.endsWith('/') ? provider.base_url.slice(0, -1) : provider.base_url;
    const url = `${cleanUrl}/chat/completions`;

    // Map messages history to OpenAI API spec format
    const apiMessages: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string; name?: string }> = [];
    
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    
    for (const msg of messages) {
      apiMessages.push({
        role: msg.role,
        content: msg.content,
        ...(msg.tool_calls ? { tool_calls: typeof msg.tool_calls === 'string' ? JSON.parse(msg.tool_calls) : msg.tool_calls } : {}),
        ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {})
      });
    }

    const payload: Record<string, any> = {
      model,
      messages: apiMessages,
      temperature: temperature ?? 0.7,
      stream
    };

    if (maxTokens) {
      payload.max_tokens = maxTokens;
    }

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    // 1. Non-streaming Execution path
    if (!stream) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error (HTTP ${response.status}): ${errText}`);
      }

      const data = await response.json() as any;
      const choice = data.choices?.[0];
      const message = choice?.message;

      return {
        content: message?.content || null,
        reasoning_content: message?.reasoning_content || null,
        tool_calls: message?.tool_calls || undefined
      };
    }

    // 2. Streaming Execution path (SSE protocol)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error (HTTP ${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error('API response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullContent = '';
    let fullReasoning = '';
    let accumulatedToolCalls: any[] = [];

    // Batching to prevent terminal flicker
    let batchedContentToken = '';
    let batchedReasoningToken = '';
    let lastEmitTime = Date.now();
    const emitIntervalMs = 60; // throttle UI updates to ~16 fps

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices?.[0];
              const delta = choice?.delta;
              
              if (delta?.content) {
                const token = delta.content;
                fullContent += token;
                batchedContentToken += token;
              }

              if (delta?.reasoning_content) {
                const reasoningToken = delta.reasoning_content;
                fullReasoning += reasoningToken;
                batchedReasoningToken += reasoningToken;
              }
              
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index;
                  if (!accumulatedToolCalls[idx]) {
                    accumulatedToolCalls[idx] = {
                      id: tc.id || '',
                      type: 'function',
                      function: { name: tc.name || '', arguments: '' }
                    };
                  }
                  if (tc.id) {
                    accumulatedToolCalls[idx].id = tc.id;
                  }
                  if (tc.function?.name) {
                    accumulatedToolCalls[idx].function.name = tc.function.name;
                  }
                  if (tc.function?.arguments) {
                    accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
                  }
                }
              }
            } catch {
              // Ignore empty SSE comment lines
            }
          }
        }

        // Emit batch periodically to prevent flickering
        if (Date.now() - lastEmitTime > emitIntervalMs && (batchedContentToken || batchedReasoningToken)) {
          eventBus.emit('stream:token', { token: batchedContentToken, reasoningToken: batchedReasoningToken });
          batchedContentToken = '';
          batchedReasoningToken = '';
          lastEmitTime = Date.now();
        }
      }
    } finally {
      reader.releaseLock();
      if (batchedContentToken || batchedReasoningToken) {
        eventBus.emit('stream:token', { token: batchedContentToken, reasoningToken: batchedReasoningToken });
      }
    }

    return {
      content: fullContent || null,
      reasoning_content: fullReasoning || null,
      tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls.filter(x => x !== null) : undefined
    };
  }
}
