import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const TERMUX_DIR = path.join(os.homedir(), '.termux');
const FONT_PATH = path.join(TERMUX_DIR, 'font.ttf');

async function installNerdFont() {
  // 1. Only run in Termux environments
  const isTermux = process.env.PREFIX && process.env.PREFIX.includes('com.termux');
  if (!isTermux) {
    return;
  }

  // 2. Check if a font.ttf already exists
  if (fs.existsSync(FONT_PATH)) {
    return;
  }

  console.log('Installing JetBrainsMono Nerd Font for Termux...');

  try {
    if (!fs.existsSync(TERMUX_DIR)) {
      fs.mkdirSync(TERMUX_DIR, { recursive: true });
    }

    // Download Regular JetBrainsMono Nerd Font (lightweight patched version)
    const fontUrl = 'https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/JetBrainsMono/Ligatures/Regular/JetBrainsMonoNerdFont-Regular.ttf';
    
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to download font: HTTP ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(FONT_PATH, Buffer.from(buffer));
    
    console.log('Nerd Font saved to ~/.termux/font.ttf.');

    // Reload Termux settings to apply the font immediately
    try {
      execSync('termux-reload-settings');
      console.log('Termux settings reloaded successfully.');
    } catch {
      // Ignore if command not found
    }
  } catch (err) {
    console.error('Failed to install Nerd Font automatically:', err.message);
  }
}

installNerdFont();
