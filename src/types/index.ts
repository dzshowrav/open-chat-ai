export interface Provider {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  base_url: string;
  api_key: string;
  status: string;
  latency: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: number;
  provider_id: number;
  model_id: string;
  display_name: string;
  description?: string;
  category: string;
  supports_streaming: boolean;
  supports_tools: boolean;
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_json: boolean;
  supports_audio: boolean;
  supports_embedding: boolean;
  max_context: number;
  max_output: number;
  favorite: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  prompt: string;
  reasoning_level: number;
  temperature: number;
  default_skills: string[]; // parsed from JSON Array
  allowed_tools: string[];   // parsed from JSON Array
  enabled: boolean;
  built_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  title: string;
  provider_id?: number;
  model_id?: number;
  agent_id?: number;
  workspace_id?: number;
  summary?: string;
  favorite: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  reasoning_content?: string | null; // Optional reasoning field
  tool_calls?: string; // JSON string
  tool_call_id?: string;
  token_input: number;
  token_output: number;
  created_at: string;
}
