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

export const DEFAULT_THEME_ID = 'tokyonight-dark';

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
  backgroundColor: string;
}

export const BUILT_IN_THEMES: Record<string, Theme> = {
  'amoled-light': {
    id: 'amoled-light',
    name: "AMOLED Light",
    author: "OpenCode",
    primaryColor: '#6200ff',
    accentColor: '#ff0080',
    darkMode: false,
    backgroundColor: '#f0f0f0'
  },
  'amoled-dark': {
    id: 'amoled-dark',
    name: "AMOLED Dark",
    author: "OpenCode",
    primaryColor: '#b388ff',
    accentColor: '#ff4081',
    darkMode: true,
    backgroundColor: '#000000'
  },
  'aura-light': {
    id: 'aura-light',
    name: "Aura Light",
    author: "OpenCode",
    primaryColor: '#a277ff',
    accentColor: '#d94f4f',
    darkMode: false,
    backgroundColor: '#f5f0ff'
  },
  'aura-dark': {
    id: 'aura-dark',
    name: "Aura Dark",
    author: "OpenCode",
    primaryColor: '#a277ff',
    accentColor: '#ff6767',
    darkMode: true,
    backgroundColor: '#15141b'
  },
  'ayu-light': {
    id: 'ayu-light',
    name: "Ayu Light",
    author: "OpenCode",
    primaryColor: '#4aa8c8',
    accentColor: '#ef7d71',
    darkMode: false,
    backgroundColor: '#fdfaf4'
  },
  'ayu-dark': {
    id: 'ayu-dark',
    name: "Ayu Dark",
    author: "OpenCode",
    primaryColor: '#3fb7e3',
    accentColor: '#f2856f',
    darkMode: true,
    backgroundColor: '#0f1419'
  },
  'carbonfox-light': {
    id: 'carbonfox-light',
    name: "Carbonfox Light",
    author: "OpenCode",
    primaryColor: '#0072c3',
    accentColor: '#da1e28',
    darkMode: false,
    backgroundColor: '#8e8e8e'
  },
  'carbonfox-dark': {
    id: 'carbonfox-dark',
    name: "Carbonfox Dark",
    author: "OpenCode",
    primaryColor: '#33b1ff',
    accentColor: '#ff8389',
    darkMode: true,
    backgroundColor: '#393939'
  },
  'catppuccin-light': {
    id: 'catppuccin-light',
    name: "Catppuccin Light",
    author: "OpenCode",
    primaryColor: '#7287fd',
    accentColor: '#d20f39',
    darkMode: false,
    backgroundColor: '#f5e0dc'
  },
  'catppuccin-dark': {
    id: 'catppuccin-dark',
    name: "Catppuccin Dark",
    author: "OpenCode",
    primaryColor: '#b4befe',
    accentColor: '#f38ba8',
    darkMode: true,
    backgroundColor: '#1e1e2e'
  },
  'catppuccin-frappe-dark': {
    id: 'catppuccin-frappe-dark',
    name: "Catppuccin Frappe Dark",
    author: "OpenCode",
    primaryColor: '#8da4e2',
    accentColor: '#f4b8e4',
    darkMode: true,
    backgroundColor: '#303446'
  },
  'catppuccin-macchiato-dark': {
    id: 'catppuccin-macchiato-dark',
    name: "Catppuccin Macchiato Dark",
    author: "OpenCode",
    primaryColor: '#8aadf4',
    accentColor: '#f5bde6',
    darkMode: true,
    backgroundColor: '#24273a'
  },
  'cobalt2-light': {
    id: 'cobalt2-light',
    name: "Cobalt2 Light",
    author: "OpenCode",
    primaryColor: '#0066cc',
    accentColor: '#00acc1',
    darkMode: false,
    backgroundColor: '#ffffff'
  },
  'cobalt2-dark': {
    id: 'cobalt2-dark',
    name: "Cobalt2 Dark",
    author: "OpenCode",
    primaryColor: '#0088ff',
    accentColor: '#2affdf',
    darkMode: true,
    backgroundColor: '#193549'
  },
  'cursor-light': {
    id: 'cursor-light',
    name: "Cursor Light",
    author: "OpenCode",
    primaryColor: '#6f9ba6',
    accentColor: '#6f9ba6',
    darkMode: false,
    backgroundColor: '#fcfcfc'
  },
  'cursor-dark': {
    id: 'cursor-dark',
    name: "Cursor Dark",
    author: "OpenCode",
    primaryColor: '#88c0d0',
    accentColor: '#88c0d0',
    darkMode: true,
    backgroundColor: '#181818'
  },
  'dracula-light': {
    id: 'dracula-light',
    name: "Dracula Light",
    author: "OpenCode",
    primaryColor: '#7c6bf5',
    accentColor: '#d16090',
    darkMode: false,
    backgroundColor: '#f8f8f2'
  },
  'dracula-dark': {
    id: 'dracula-dark',
    name: "Dracula Dark",
    author: "OpenCode",
    primaryColor: '#bd93f9',
    accentColor: '#ff79c6',
    darkMode: true,
    backgroundColor: '#1d1e28'
  },
  'everforest-light': {
    id: 'everforest-light',
    name: "Everforest Light",
    author: "OpenCode",
    primaryColor: '#8da101',
    accentColor: '#df69ba',
    darkMode: false,
    backgroundColor: '#fdf6e3'
  },
  'everforest-dark': {
    id: 'everforest-dark',
    name: "Everforest Dark",
    author: "OpenCode",
    primaryColor: '#a7c080',
    accentColor: '#d699b6',
    darkMode: true,
    backgroundColor: '#2d353b'
  },
  'flexoki-light': {
    id: 'flexoki-light',
    name: "Flexoki Light",
    author: "OpenCode",
    primaryColor: '#205EA6',
    accentColor: '#BC5215',
    darkMode: false,
    backgroundColor: '#FFFCF0'
  },
  'flexoki-dark': {
    id: 'flexoki-dark',
    name: "Flexoki Dark",
    author: "OpenCode",
    primaryColor: '#DA702C',
    accentColor: '#8B7EC8',
    darkMode: true,
    backgroundColor: '#100F0F'
  },
  'github-light': {
    id: 'github-light',
    name: "GitHub Light",
    author: "OpenCode",
    primaryColor: '#0969da',
    accentColor: '#1b7c83',
    darkMode: false,
    backgroundColor: '#ffffff'
  },
  'github-dark': {
    id: 'github-dark',
    name: "GitHub Dark",
    author: "OpenCode",
    primaryColor: '#58a6ff',
    accentColor: '#39c5cf',
    darkMode: true,
    backgroundColor: '#0d1117'
  },
  'gruvbox-light': {
    id: 'gruvbox-light',
    name: "Gruvbox Light",
    author: "OpenCode",
    primaryColor: '#076678',
    accentColor: '#9d0006',
    darkMode: false,
    backgroundColor: '#fbf1c7'
  },
  'gruvbox-dark': {
    id: 'gruvbox-dark',
    name: "Gruvbox Dark",
    author: "OpenCode",
    primaryColor: '#83a598',
    accentColor: '#fb4934',
    darkMode: true,
    backgroundColor: '#282828'
  },
  'kanagawa-light': {
    id: 'kanagawa-light',
    name: "Kanagawa Light",
    author: "OpenCode",
    primaryColor: '#2D4F67',
    accentColor: '#D27E99',
    darkMode: false,
    backgroundColor: '#F2E9DE'
  },
  'kanagawa-dark': {
    id: 'kanagawa-dark',
    name: "Kanagawa Dark",
    author: "OpenCode",
    primaryColor: '#7E9CD8',
    accentColor: '#D27E99',
    darkMode: true,
    backgroundColor: '#1F1F28'
  },
  'lucent-orng-light': {
    id: 'lucent-orng-light',
    name: "Lucent Orng Light",
    author: "OpenCode",
    primaryColor: '#EC5B2B',
    accentColor: '#c94d24',
    darkMode: false,
    backgroundColor: '#fff5f0'
  },
  'lucent-orng-dark': {
    id: 'lucent-orng-dark',
    name: "Lucent Orng Dark",
    author: "OpenCode",
    primaryColor: '#EC5B2B',
    accentColor: '#FFF7F1',
    darkMode: true,
    backgroundColor: '#2a1a15'
  },
  'material-light': {
    id: 'material-light',
    name: "Material Light",
    author: "OpenCode",
    primaryColor: '#6182b8',
    accentColor: '#39adb5',
    darkMode: false,
    backgroundColor: '#fafafa'
  },
  'material-dark': {
    id: 'material-dark',
    name: "Material Dark",
    author: "OpenCode",
    primaryColor: '#82aaff',
    accentColor: '#89ddff',
    darkMode: true,
    backgroundColor: '#263238'
  },
  'matrix-light': {
    id: 'matrix-light',
    name: "Matrix Light",
    author: "OpenCode",
    primaryColor: '#1cc24b',
    accentColor: '#c770ff',
    darkMode: false,
    backgroundColor: '#eef3ea'
  },
  'matrix-dark': {
    id: 'matrix-dark',
    name: "Matrix Dark",
    author: "OpenCode",
    primaryColor: '#2eff6a',
    accentColor: '#c770ff',
    darkMode: true,
    backgroundColor: '#0a0e0a'
  },
  'mercury-light': {
    id: 'mercury-light',
    name: "Mercury Light",
    author: "OpenCode",
    primaryColor: '#5266eb',
    accentColor: '#8da4f5',
    darkMode: false,
    backgroundColor: '#ffffff'
  },
  'mercury-dark': {
    id: 'mercury-dark',
    name: "Mercury Dark",
    author: "OpenCode",
    primaryColor: '#8da4f5',
    accentColor: '#8da4f5',
    darkMode: true,
    backgroundColor: '#171721'
  },
  'monokai-light': {
    id: 'monokai-light',
    name: "Monokai Light",
    author: "OpenCode",
    primaryColor: '#bf7bff',
    accentColor: '#d9487c',
    darkMode: false,
    backgroundColor: '#fdf8ec'
  },
  'monokai-dark': {
    id: 'monokai-dark',
    name: "Monokai Dark",
    author: "OpenCode",
    primaryColor: '#ae81ff',
    accentColor: '#f92672',
    darkMode: true,
    backgroundColor: '#272822'
  },
  'night-owl-light': {
    id: 'night-owl-light',
    name: "Night Owl Light",
    author: "OpenCode",
    primaryColor: '#4876d6',
    accentColor: '#aa0982',
    darkMode: false,
    backgroundColor: '#f0f0f0'
  },
  'night-owl-dark': {
    id: 'night-owl-dark',
    name: "Night Owl Dark",
    author: "OpenCode",
    primaryColor: '#82aaff',
    accentColor: '#f78c6c',
    darkMode: true,
    backgroundColor: '#011627'
  },
  'nord-light': {
    id: 'nord-light',
    name: "Nord Light",
    author: "OpenCode",
    primaryColor: '#5e81ac',
    accentColor: '#bf616a',
    darkMode: false,
    backgroundColor: '#eceff4'
  },
  'nord-dark': {
    id: 'nord-dark',
    name: "Nord Dark",
    author: "OpenCode",
    primaryColor: '#88c0d0',
    accentColor: '#d57780',
    darkMode: true,
    backgroundColor: '#2e3440'
  },
  'one-dark-light': {
    id: 'one-dark-light',
    name: "One Dark Light",
    author: "OpenCode",
    primaryColor: '#4078f2',
    accentColor: '#0184bc',
    darkMode: false,
    backgroundColor: '#fafafa'
  },
  'one-dark-dark': {
    id: 'one-dark-dark',
    name: "One Dark Dark",
    author: "OpenCode",
    primaryColor: '#61afef',
    accentColor: '#56b6c2',
    darkMode: true,
    backgroundColor: '#282c34'
  },
  'one-dark-pro-light': {
    id: 'one-dark-pro-light',
    name: "One Dark Pro Light",
    author: "OpenCode",
    primaryColor: '#528bff',
    accentColor: '#d85462',
    darkMode: false,
    backgroundColor: '#f5f6f8'
  },
  'one-dark-pro-dark': {
    id: 'one-dark-pro-dark',
    name: "One Dark Pro Dark",
    author: "OpenCode",
    primaryColor: '#61afef',
    accentColor: '#e06c75',
    darkMode: true,
    backgroundColor: '#1e222a'
  },
  'opencode-default-light': {
    id: 'opencode-default-light',
    name: "OpenCode (Default) Light",
    author: "OpenCode",
    primaryColor: '#3b7dd8',
    accentColor: '#d68c27',
    darkMode: false,
    backgroundColor: '#ffffff'
  },
  'opencode-default-dark': {
    id: 'opencode-default-dark',
    name: "OpenCode (Default) Dark",
    author: "OpenCode",
    primaryColor: '#fab283',
    accentColor: '#9d7cd8',
    darkMode: true,
    backgroundColor: '#0a0a0a'
  },
  'orng-light': {
    id: 'orng-light',
    name: "Orng Light",
    author: "OpenCode",
    primaryColor: '#EC5B2B',
    accentColor: '#c94d24',
    darkMode: false,
    backgroundColor: '#ffffff'
  },
  'orng-dark': {
    id: 'orng-dark',
    name: "Orng Dark",
    author: "OpenCode",
    primaryColor: '#EC5B2B',
    accentColor: '#FFF7F1',
    darkMode: true,
    backgroundColor: '#0a0a0a'
  },
  'osaka-jade-light': {
    id: 'osaka-jade-light',
    name: "Osaka Jade Light",
    author: "OpenCode",
    primaryColor: '#1faa90',
    accentColor: '#3d7a52',
    darkMode: false,
    backgroundColor: '#F6F5DD'
  },
  'osaka-jade-dark': {
    id: 'osaka-jade-dark',
    name: "Osaka Jade Dark",
    author: "OpenCode",
    primaryColor: '#2DD5B7',
    accentColor: '#549e6a',
    darkMode: true,
    backgroundColor: '#111c18'
  },
  'palenight-light': {
    id: 'palenight-light',
    name: "Palenight Light",
    author: "OpenCode",
    primaryColor: '#4976eb',
    accentColor: '#00acc1',
    darkMode: false,
    backgroundColor: '#fafafa'
  },
  'palenight-dark': {
    id: 'palenight-dark',
    name: "Palenight Dark",
    author: "OpenCode",
    primaryColor: '#82aaff',
    accentColor: '#89ddff',
    darkMode: true,
    backgroundColor: '#292d3e'
  },
  'rose-pine-light': {
    id: 'rose-pine-light',
    name: "Rose Pine Light",
    author: "OpenCode",
    primaryColor: '#31748f',
    accentColor: '#d7827e',
    darkMode: false,
    backgroundColor: '#faf4ed'
  },
  'rose-pine-dark': {
    id: 'rose-pine-dark',
    name: "Rose Pine Dark",
    author: "OpenCode",
    primaryColor: '#9ccfd8',
    accentColor: '#ebbcba',
    darkMode: true,
    backgroundColor: '#191724'
  },
  'shades-of-purple-light': {
    id: 'shades-of-purple-light',
    name: "Shades of Purple Light",
    author: "OpenCode",
    primaryColor: '#7a5af8',
    accentColor: '#ff6bd5',
    darkMode: false,
    backgroundColor: '#f7ebff'
  },
  'shades-of-purple-dark': {
    id: 'shades-of-purple-dark',
    name: "Shades of Purple Dark",
    author: "OpenCode",
    primaryColor: '#c792ff',
    accentColor: '#ff7ac6',
    darkMode: true,
    backgroundColor: '#1a102b'
  },
  'solarized-light': {
    id: 'solarized-light',
    name: "Solarized Light",
    author: "OpenCode",
    primaryColor: '#268bd2',
    accentColor: '#d33682',
    darkMode: false,
    backgroundColor: '#fdf6e3'
  },
  'solarized-dark': {
    id: 'solarized-dark',
    name: "Solarized Dark",
    author: "OpenCode",
    primaryColor: '#6c71c4',
    accentColor: '#d33682',
    darkMode: true,
    backgroundColor: '#002b36'
  },
  'synthwave-84-light': {
    id: 'synthwave-84-light',
    name: "Synthwave '84 Light",
    author: "OpenCode",
    primaryColor: '#00bcd4',
    accentColor: '#9c27b0',
    darkMode: false,
    backgroundColor: '#fafafa'
  },
  'synthwave-84-dark': {
    id: 'synthwave-84-dark',
    name: "Synthwave '84 Dark",
    author: "OpenCode",
    primaryColor: '#36f9f6',
    accentColor: '#b084eb',
    darkMode: true,
    backgroundColor: '#262335'
  },
  'tokyonight-light': {
    id: 'tokyonight-light',
    name: "Tokyonight Light",
    author: "OpenCode",
    primaryColor: '#2e7de9',
    accentColor: '#b15c00',
    darkMode: false,
    backgroundColor: '#e1e2e7'
  },
  'tokyonight-dark': {
    id: 'tokyonight-dark',
    name: "Tokyonight Dark",
    author: "OpenCode",
    primaryColor: '#7aa2f7',
    accentColor: '#ff9e64',
    darkMode: true,
    backgroundColor: '#1a1b26'
  },
  'vercel-light': {
    id: 'vercel-light',
    name: "Vercel Light",
    author: "OpenCode",
    primaryColor: '#0070F3',
    accentColor: '#8E4EC6',
    darkMode: false,
    backgroundColor: '#FFFFFF'
  },
  'vercel-dark': {
    id: 'vercel-dark',
    name: "Vercel Dark",
    author: "OpenCode",
    primaryColor: '#0070F3',
    accentColor: '#8E4EC6',
    darkMode: true,
    backgroundColor: '#000000'
  },
  'vesper-light': {
    id: 'vesper-light',
    name: "Vesper Light",
    author: "OpenCode",
    primaryColor: '#FFC799',
    accentColor: '#B30000',
    darkMode: false,
    backgroundColor: '#F0F0F0'
  },
  'vesper-dark': {
    id: 'vesper-dark',
    name: "Vesper Dark",
    author: "OpenCode",
    primaryColor: '#FFC799',
    accentColor: '#FF8080',
    darkMode: true,
    backgroundColor: '#101010'
  },
  'zenburn-light': {
    id: 'zenburn-light',
    name: "Zenburn Light",
    author: "OpenCode",
    primaryColor: '#5f7f8f',
    accentColor: '#5f8f8f',
    darkMode: false,
    backgroundColor: '#ffffef'
  },
  'zenburn-dark': {
    id: 'zenburn-dark',
    name: "Zenburn Dark",
    author: "OpenCode",
    primaryColor: '#8cd0d3',
    accentColor: '#93e0e3',
    darkMode: true,
    backgroundColor: '#3f3f3f'
  },
  'oc-2-secondary-opencode-light': {
    id: 'oc-2-secondary-opencode-light',
    name: "OC-2 (Secondary OpenCode) Light",
    author: "OpenCode",
    primaryColor: '#dcde8d',
    accentColor: '#dcde8d',
    darkMode: false,
    backgroundColor: '#f7f7f7'
  },
  'oc-2-secondary-opencode-dark': {
    id: 'oc-2-secondary-opencode-dark',
    name: "OC-2 (Secondary OpenCode) Dark",
    author: "OpenCode",
    primaryColor: '#fab283',
    accentColor: '#fab283',
    darkMode: true,
    backgroundColor: '#1C1C1C'
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
    command: '/themes',
    description: 'Switch between 72 color themes from themes.md',
    usage: '/themes'
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
