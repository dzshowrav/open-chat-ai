import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let version = '1.0.0';
try {
  const packageJsonPath = path.resolve(__dirname, '../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  version = packageJson.version || '1.0.0';
} catch (e) {
  // fallback to default
}

export const APP_NAME = 'OpenChat CLI';
export const APP_VERSION = version;

export const DATABASE_FILENAME = 'openchat.db';

export const DEFAULT_THEME_ID = 'tokyo-night';

// Built-in agents
export enum BuiltInAgents {
  General = 'General',
  Debugger = 'Debugger'
}

// Built-in theme definitions
export interface Theme {
  id: string;
  name: string;
  author: string;
  primaryColor: string;
  accentColor: string;
  darkMode: boolean;
}

export const BUILT_IN_THEMES: Record<string, Theme> = {
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    author: 'OpenChat',
    primaryColor: '#7aa2f7', // soft blue
    accentColor: '#bb9af7',  // lavender
    darkMode: true
  },
  'nord': {
    id: 'nord',
    name: 'Nord',
    author: 'OpenChat',
    primaryColor: '#88c0d0', // frosty blue
    accentColor: '#b48ead',  // purple-ish
    darkMode: true
  },
  'gruvbox': {
    id: 'gruvbox',
    name: 'Gruvbox',
    author: 'OpenChat',
    primaryColor: '#d65d0e', // warm orange
    accentColor: '#fabd2f',  // warm yellow
    darkMode: true
  },
  'catppuccin': {
    id: 'catppuccin',
    name: 'Catppuccin Macchiato',
    author: 'OpenChat',
    primaryColor: '#8aadf4', // sky blue
    accentColor: '#f5bde6',  // pink
    darkMode: true
  },
  'dracula': {
    id: 'dracula',
    name: 'Dracula',
    author: 'OpenChat',
    primaryColor: '#8be9fd', // cyan
    accentColor: '#ff79c6',  // hot pink
    darkMode: true
  },
  'monochrome': {
    id: 'monochrome',
    name: 'Monochrome',
    author: 'OpenChat',
    primaryColor: '#ffffff', // white
    accentColor: '#888888',  // gray
    darkMode: true
  }
};

// Tool Categories
export type ToolCategory = 'read' | 'write' | 'execution' | 'network' | 'mcp' | 'diagnostics';

// Tool Permission levels
export type PermissionLevel = 'always_allow' | 'allow_once' | 'ask' | 'deny';

// Slash Commands Specification
export interface CommandSpec {
  command: string;
  description: string;
  usage: string;
}

export const BUILT_IN_COMMANDS: CommandSpec[] = [
  {
    command: '/update latest',
    description: 'Fetch and update OpenChat AI to the latest version',
    usage: '/update latest'
  },
  {
    command: '/provider api',
    description: 'Add a new OpenAI-compatible provider API endpoint',
    usage: '/provider api'
  },
  {
    command: '/providers',
    description: 'List and manage configured provider API endpoints',
    usage: '/providers'
  },
  {
    command: '/add model',
    description: 'Add a model associated with a provider',
    usage: '/add model'
  },
  {
    command: '/all models',
    description: 'Switch between models and providers',
    usage: '/all models'
  },
  {
    command: '/agents',
    description: 'List and switch active agents',
    usage: '/agents'
  },
  {
    command: '/skills',
    description: 'Manage reusable knowledge/prompt skills modules',
    usage: '/skills'
  },
  {
    command: '/history',
    description: 'View session history and resume chats',
    usage: '/history'
  },
  {
    command: '/settings',
    description: 'Configure appearance, tools, and behavior settings',
    usage: '/settings'
  },
  {
    command: '/tools',
    description: 'Browse all registered native AI tools with category filters and permission status',
    usage: '/tools'
  },
  {
    command: '/permissions',
    description: 'Manage per-tool execution permissions (Always Allow / Ask / Deny)',
    usage: '/permissions'
  },
  {
    command: '/mcp',
    description: 'Manage external Model Context Protocol (MCP) servers',
    usage: '/mcp'
  },
  {
    command: '/help',
    description: 'Show manual and documentation instructions',
    usage: '/help'
  },
  {
    command: '/uninstall',
    description: 'Completely uninstall OpenChat AI from this system',
    usage: '/uninstall'
  },
  {
    command: '/backup',
    description: 'Backup AI credentials (providers and models) to backup.json',
    usage: '/backup'
  },
  {
    command: '/restore',
    description: 'Restore AI credentials (providers and models) from backup.json',
    usage: '/restore'
  },
  {
    command: '/exit',
    description: 'Cleanly exit the application',
    usage: '/exit'
  }
];
