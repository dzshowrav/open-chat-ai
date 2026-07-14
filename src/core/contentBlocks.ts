/**
 * contentBlocks.ts
 *
 * Content block lifecycle helpers — adapted from Ivan Leo's article pattern.
 *
 * Manages the 3-phase lifecycle of each content block in an AI stream:
 *   1. content_block_start  →  creates initial message structure
 *   2. content_block_delta  →  incrementally updates text or tool arguments
 *   3. content_block_stop   →  validates & executes tool, returns tool_result
 *
 * The article's original pattern used Anthropic SDK events. Here we adapt
 * the same clean separation for our OpenAI-compatible SSE stream.
 */

import { ToolManager } from '../tools/toolManager.js';
import { eventBus } from './events.js';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface ApiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  reasoning_content?: string;
}

/**
 * Check if the last message in the conversation is a tool_result.
 * If so, the model needs another round to respond to that result.
 */
export function isToolResult(messages: ApiMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last) return false;
  return last.role === 'tool';
}

/**
 * Build the initial API message payload array from DB messages + system prompt.
 */
export function buildApiMessages(
  dbMessages: any[],
  systemPrompt: string
): ApiMessage[] {
  const apiMessages: ApiMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const m of dbMessages) {
    const msg: ApiMessage = {
      role: m.role,
      content: m.content,
    };

    if (m.tool_calls) {
      msg.tool_calls =
        typeof m.tool_calls === 'string'
          ? JSON.parse(m.tool_calls)
          : m.tool_calls;
    }
    if (m.tool_call_id) {
      msg.tool_call_id = m.tool_call_id;
    }
    if (m.reasoning_content) {
      msg.reasoning_content = m.reasoning_content;
    }

    apiMessages.push(msg);
  }

  return apiMessages;
}

/**
 * Parse tool call arguments from a stream-accumulated tool call object.
 * Handles both string and pre-parsed argument formats.
 */
export function parseToolArgs(toolCall: any): Record<string, any> {
  if (!toolCall?.function?.arguments) return {};

  let argsStr = toolCall.function.arguments;

  // Handle double-encoded JSON
  if (typeof argsStr === 'string') {
    try {
      const parsed = JSON.parse(argsStr);
      if (typeof parsed === 'string') {
        argsStr = parsed;
      } else {
        return parsed;
      }
    } catch {
      // Not valid JSON yet (stream not complete) — return as-is
      return { raw: argsStr };
    }
  }

  // Already an object
  if (typeof argsStr === 'object') return argsStr;

  // Final parse attempt
  try {
    return JSON.parse(argsStr);
  } catch {
    return { raw: argsStr };
  }
}

/**
 * Extract the target identifier from tool args for display purposes
 * (e.g., file path from 'path', URL from 'url', search query from 'query').
 */
export function getToolTargetDisplay(
  _toolName: string,
  args: Record<string, any>
): string {
  const targetStr = String(
    args.path || args.url || args.query || args.command || args.TargetFile || args.DirectoryPath || ''
  );
  if (!targetStr) return '';

  return targetStr.length > 50
    ? targetStr.slice(0, 20) + '...' + targetStr.slice(-25)
    : targetStr;
}

/**
 * Get a human-readable "nice name" for a tool (e.g., read_file → Read).
 */
export function getToolNiceName(toolName: string): string {
  const name = toolName.replace(/_file|_process|_content/g, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Execute a single tool by name and return the result + metadata.
 * Uses ToolManager (which handles permissions).
 */
export async function executeSingleTool(
  toolName: string,
  args: Record<string, any>
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const res = await ToolManager.executeTool(toolName, args);
    const output = typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res);
    return { success: true, output };
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err.message || String(err),
    };
  }
}

/**
 * Execute all tools from a response and return tool_result messages.
 * This is the core tool execution loop helper.
 */
export async function executeToolCalls(
  accumulatedToolCalls: any[]
): Promise<ApiMessage[]> {
  const toolMessages: ApiMessage[] = [];

  for (let i = 0; i < accumulatedToolCalls.length; i++) {
    const tc = accumulatedToolCalls[i];
    if (!tc || !tc.function) continue;

    const toolName = tc.function.name || 'unknown';
    const toolId = tc.id || '';
    const toolArgs = parseToolArgs(tc);

    // Emit executing event — ToolCallStreamCard switches to 'running' state
    eventBus.emit('tool:executing', { toolName, toolId, index: i });

    const result = await executeSingleTool(toolName, toolArgs);

    // Emit executed event — ToolCallStreamCard switches to 'completed' state
    eventBus.emit('tool:executed', { toolName, toolId, index: i, success: result.success });

    toolMessages.push({
      role: 'tool',
      tool_call_id: toolId,
      content: result.error || result.output,
    });
  }

  return toolMessages;
}
