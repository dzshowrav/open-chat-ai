import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('themes.md', 'utf8');
const lines = content.split('\n');

const themes = {};
let currentTheme = null;
let currentMode = null;

const headerRegex = /^##\s+\d+\.\s+(.+)$/;
const modeRegex = /^###\s+(Light|Dark)\s+Mode/;
const tokenRegex = /^\|\s*(\w+)\s*\|\s*`([^`]+)`/;

for (const line of lines) {
  const headerMatch = line.match(headerRegex);
  if (headerMatch) {
    const name = headerMatch[1].trim();
    currentTheme = {
      name,
      light: {},
      dark: {}
    };
    themes[name] = currentTheme;
    currentMode = null;
    continue;
  }

  const modeMatch = line.match(modeRegex);
  if (modeMatch) {
    currentMode = modeMatch[1].toLowerCase(); // 'light' or 'dark'
    continue;
  }

  // Handle case where theme uses identical palette for both modes
  if (line.includes('use identical palette') || line.includes('designed as a dark-only experience')) {
    if (currentTheme) {
      currentMode = 'dark'; // treat as dark mode
    }
  }

  if (currentTheme && currentMode) {
    const tokenMatch = line.match(tokenRegex);
    if (tokenMatch) {
      const token = tokenMatch[1].trim();
      const value = tokenMatch[2].trim();
      currentTheme[currentMode][token] = value;
    }
  }
}

// Convert parsed themes into a list of compatible TUI theme definitions
const themeList = [];

for (const [name, data] of Object.entries(themes)) {
  const kebabId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  // Add Light Mode if it has primary color defined
  if (data.light.primary) {
    themeList.push({
      id: `${kebabId}-light`,
      name: `${name} Light`,
      author: 'OpenCode',
      primaryColor: data.light.primary,
      accentColor: data.light.accent || data.light.primary,
      darkMode: false,
      backgroundColor: data.light.neutral || '#ffffff',
      textColor: data.light.ink || '#000000'
    });
  }

  // Add Dark Mode if it has primary color defined
  if (data.dark.primary) {
    themeList.push({
      id: `${kebabId}-dark`,
      name: `${name} Dark`,
      author: 'OpenCode',
      primaryColor: data.dark.primary,
      accentColor: data.dark.accent || data.dark.primary,
      darkMode: true,
      backgroundColor: data.dark.neutral || '#000000',
      textColor: data.dark.ink || '#ffffff'
    });
  }
  
  // Fallback if neither mode has primary but has some tokens
  if (!data.light.primary && !data.dark.primary) {
    const hasKeys = (mode) => Object.keys(data[mode]).length > 0;
    if (hasKeys('dark')) {
      themeList.push({
        id: `${kebabId}-dark`,
        name: `${name} Dark`,
        author: 'OpenCode',
        primaryColor: data.dark.primary || '#ffffff',
        accentColor: data.dark.accent || '#ffffff',
        darkMode: true,
        backgroundColor: data.dark.neutral || '#000000',
        textColor: data.dark.ink || '#ffffff'
      });
    } else if (hasKeys('light')) {
      themeList.push({
        id: `${kebabId}-light`,
        name: `${name} Light`,
        author: 'OpenCode',
        primaryColor: data.light.primary || '#000000',
        accentColor: data.light.accent || '#000000',
        darkMode: false,
        backgroundColor: data.light.neutral || '#ffffff',
        textColor: data.light.ink || '#000000'
      });
    }
  }
}

// Format the themes block as TypeScript object
const themesBlock = `export const BUILT_IN_THEMES: Record<string, Theme> = {
${themeList.map(t => `  '${t.id}': {
    id: '${t.id}',
    name: "${t.name.replace(/"/g, '\\"')}",
    author: "${t.author.replace(/"/g, '\\"')}",
    primaryColor: '${t.primaryColor}',
    accentColor: '${t.accentColor}',
    darkMode: ${t.darkMode},
    backgroundColor: '${t.backgroundColor}',
    textColor: '${t.textColor}'
  }`).join(',\n')}
};`;

// Update constants.ts
const constantsPath = 'src/core/constants.ts';
let constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Replace DEFAULT_THEME_ID
constantsContent = constantsContent.replace(
  /export const DEFAULT_THEME_ID = 'tokyo-night';/,
  `export const DEFAULT_THEME_ID = 'tokyonight-dark';`
);

// Replace BUILT_IN_THEMES block
const startIdx = constantsContent.indexOf('export const BUILT_IN_THEMES: Record<string, Theme> = {');
if (startIdx !== -1) {
  // Find the closing brace of the block. We need to find the matching '};'
  const endIdx = constantsContent.indexOf('};', startIdx);
  if (endIdx !== -1) {
    constantsContent = constantsContent.substring(0, startIdx) + themesBlock + constantsContent.substring(endIdx + 2);
  }
}

fs.writeFileSync(constantsPath, constantsContent, 'utf8');
console.log(`Successfully updated ${constantsPath} with ${themeList.length} themes!`);
