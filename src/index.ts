#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppEngine } from './core/engine.js';
import { eventBus } from './core/events.js';
import App from './ui/App.js';

// ─────────────────────────────────────────────────────────
// Process-level crash protection (Node.js v26+)
// Without these, ANY unhandled rejection crashes the entire app.
// ─────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  // Log and continue — app stays alive
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(`[OpenChat] Unhandled Rejection: ${msg}`);
});
process.on('uncaughtException', (err: Error) => {
  // Log and continue — prevents immediate crash
  console.error(`[OpenChat] Uncaught Exception: ${err.message}`);
});

async function main() {
  const engine = new AppEngine();

  if (process.argv.includes('--uninstall')) {
    console.log('Uninstalling OpenChat AI...');
    const success = await engine.uninstall();
    if (success) {
      console.log('OpenChat AI successfully uninstalled.');
    } else {
      console.log('Could not automatically run global npm uninstall. You may need to run: npm uninstall -g openchat-ai');
    }
    process.exit(0);
  }

  if (process.argv.includes('--clean') || process.argv.includes('--reset')) {
    await engine.clean();
    process.exit(0);
  }

  // Hook start event to boot the Ink UI render loop
  eventBus.on('app:start', () => {
    render(React.createElement(App), { patchConsole: false, exitOnCtrlC: false });
  });

  // Start Core Engine
  await engine.start();
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
