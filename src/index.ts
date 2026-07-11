#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppEngine } from './core/engine.js';
import { eventBus } from './core/events.js';
import App from './ui/App.js';
import { getDbPath } from './database/connection.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function main() {
  if (process.argv.includes('--uninstall')) {
    const dbPath = getDbPath();
    const openChatDir = path.dirname(dbPath); // ~/.openchat
    
    console.log('Uninstalling OpenChat AI...');
    
    // 1. Remove database folder
    if (fs.existsSync(openChatDir)) {
      try {
        fs.rmSync(openChatDir, { recursive: true, force: true });
        console.log('Removed global storage directory: ~/.openchat');
      } catch (err) {
        console.error('Failed to remove global storage directory:', err instanceof Error ? err.message : String(err));
      }
    }
    
    // 2. Remove configuration folder if exists
    const homePath = os.homedir();
    const configDir = path.join(homePath, '.config', 'openchat');
    if (fs.existsSync(configDir)) {
      try {
        fs.rmSync(configDir, { recursive: true, force: true });
        console.log('Removed configuration directory: ~/.config/openchat');
      } catch (err) {
        console.error('Failed to remove configuration directory:', err instanceof Error ? err.message : String(err));
      }
    }

    // 3. Remove global npm package
    console.log('Removing global npm package/link...');
    try {
      const execSync = (await import('child_process')).execSync;
      execSync('npm uninstall -g openchat-ai', { stdio: 'inherit' });
      console.log('Uninstalled openchat-ai globally.');
    } catch (err) {
      console.log('Could not automatically run global npm uninstall. You may need to run: npm uninstall -g openchat-ai');
    }
    
    console.log('OpenChat AI successfully uninstalled.');
    process.exit(0);
  }

  if (process.argv.includes('--clean') || process.argv.includes('--reset')) {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Database cleaned up successfully (fresh installation state).');
    } else {
      console.log('No database found to clean up.');
    }
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch {}
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch {}
    }
    process.exit(0);
  }

  const engine = new AppEngine();
  
  // Hook start event to boot the Ink UI render loop
  eventBus.on('app:start', () => {
    render(React.createElement(App));
  });

  // Start Core Engine
  await engine.start();
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
