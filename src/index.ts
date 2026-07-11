#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppEngine } from './core/engine.js';
import { eventBus } from './core/events.js';
import App from './ui/App.js';
import { getDbPath } from './database/connection.js';
import fs from 'fs';

async function main() {
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
