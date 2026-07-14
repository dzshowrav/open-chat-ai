export interface ProviderRow {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  base_url: string;
  api_key: string;
  status: string;
  latency: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface ModelRow {
  id: number;
  provider_id: number;
  model_id: string;
  display_name: string;
  description: string | null;
  category: string;
  supports_streaming: number;
  supports_tools: number;
  supports_reasoning: number;
  supports_vision: number;
  supports_json: number;
  supports_audio: number;
  supports_embedding: number;
  max_context: number;
  max_output: number;
  favorite: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface AgentRow {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  prompt: string;
  reasoning_level: number;
  temperature: number;
  default_skills: string;
  allowed_tools: string;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: number;
  title: string;
  provider_id: number | null;
  model_id: number | null;
  agent_id: number | null;
  workspace_id: number | null;
  summary: string | null;
  favorite: number;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: number;
  session_id: number;
  role: string;
  content: string | null;
  reasoning_content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
  token_input: number;
  token_output: number;
  created_at: string;
}

export interface WorkspaceRow {
  id: number;
  name: string;
  path: string;
  language: string | null;
  framework: string | null;
  package_manager: string | null;
  git_branch: string | null;
  last_scan: string | null;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

export interface PermissionRow {
  tool_name: string;
  permission: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface CountResult {
  count: number;
}

export interface McpServerRow {
  id: number;
  name: string;
  command: string;
  args: string | null;
  env: string | null;
  status: string;
}
