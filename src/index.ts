#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppEngine } from './core/engine.js';
import { eventBus } from './core/events.js';
import App from './ui/App.js';

async function main() {
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
