-- OpenChat CLI - SQLite Database Schema
-- Version: 1.0.0

-- Enable WAL mode and Foreign Keys should be executed at connection setup:
-- PRAGMA journal_mode = WAL;
-- PRAGMA foreign_keys = ON;

-- 1. Providers Table
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    latency INTEGER DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_providers_base_url ON providers(base_url);

-- 2. Models Table
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    supports_streaming BOOLEAN NOT NULL DEFAULT 1,
    supports_tools BOOLEAN NOT NULL DEFAULT 0,
    supports_reasoning BOOLEAN NOT NULL DEFAULT 0,
    supports_vision BOOLEAN NOT NULL DEFAULT 0,
    supports_json BOOLEAN NOT NULL DEFAULT 0,
    supports_audio BOOLEAN NOT NULL DEFAULT 0,
    supports_embedding BOOLEAN NOT NULL DEFAULT 0,
    max_context INTEGER DEFAULT 4096,
    max_output INTEGER DEFAULT 2048,
    favorite BOOLEAN NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    UNIQUE(provider_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_model_id ON models(model_id);

-- 3. Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    prompt TEXT NOT NULL,
    reasoning_level INTEGER DEFAULT 0,
    temperature REAL DEFAULT 0.7,
    default_skills TEXT, -- JSON Array of skill IDs
    allowed_tools TEXT, -- JSON Array of tool names
    enabled BOOLEAN NOT NULL DEFAULT 1,
    built_in BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Skills Table
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    category TEXT,
    description TEXT,
    priority INTEGER DEFAULT 100,
    path TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    built_in BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workspace Table
CREATE TABLE IF NOT EXISTS workspace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    language TEXT,
    framework TEXT,
    package_manager TEXT,
    git_branch TEXT,
    last_scan TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_path ON workspace(path);

-- 6. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    provider_id INTEGER,
    model_id INTEGER,
    agent_id INTEGER,
    workspace_id INTEGER,
    summary TEXT,
    favorite BOOLEAN NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    FOREIGN KEY(model_id) REFERENCES models(id) ON DELETE SET NULL,
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspace(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

-- 7. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT,
    reasoning_content TEXT, -- Store raw AI model reasoning/thinking thoughts
    tool_calls TEXT, -- JSON structure representing tool calls request
    tool_call_id TEXT, -- ID of the tool call this message is associated with
    token_input INTEGER DEFAULT 0,
    token_output INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);

-- 8. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON-encoded configuration value
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    tool_name TEXT PRIMARY KEY,
    permission TEXT NOT NULL CHECK(permission IN ('always_allow', 'allow_once', 'ask', 'deny')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tools Table
CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    plugin TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    version TEXT DEFAULT '1.0.0'
);

-- 11. Tool Logs Table
CREATE TABLE IF NOT EXISTS tool_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool TEXT NOT NULL,
    arguments TEXT, -- JSON parameters passed
    status TEXT NOT NULL CHECK(status IN ('success', 'failure')),
    duration INTEGER NOT NULL, -- duration in ms
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tool_logs_tool ON tool_logs(tool);
CREATE INDEX IF NOT EXISTS idx_tool_logs_created_at ON tool_logs(created_at);

-- 12. MCP Servers Table
CREATE TABLE IF NOT EXISTS mcp_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    transport TEXT NOT NULL CHECK(transport IN ('stdio', 'http', 'https', 'sse')),
    command TEXT, -- Command to execute if stdio
    arguments TEXT, -- JSON Array of arguments if stdio
    url TEXT, -- URL if http/https/sse
    environment TEXT, -- JSON Object of environment variables
    status TEXT NOT NULL DEFAULT 'disconnected',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    auto_connect BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Plugins Table
CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    author TEXT,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Themes Table
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT,
    version TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    dark_mode BOOLEAN NOT NULL DEFAULT 1
);

-- 15. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('model', 'command', 'skill', 'agent', 'session')),
    item_id TEXT NOT NULL, -- can be ID of model/skill/agent/session
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, item_id)
);

-- 16. History Table (recent items cache)
CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'commands', 'models', 'providers', 'files', 'sessions'
    item_id TEXT NOT NULL,
    metadata TEXT, -- JSON encoded extra details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_type_item ON history(type, item_id);

-- 17. Cache Table
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- cached contents (JSON or plain text)
    expires_at TIMESTAMP NOT NULL
);

-- 18. Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('message', 'file', 'session')),
    item_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, item_id)
);

-- 19. Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    message_id INTEGER,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 20. Statistics Table
CREATE TABLE IF NOT EXISTS statistics (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
