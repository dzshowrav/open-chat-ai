import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a singleton worker instance so we don't spawn a worker per message
let worker: Worker | null = null;
let messageIdCounter = 0;
const callbacks = new Map<string, (result: string) => void>();

function getWorker(): Worker {
  if (!worker) {
    // Note: In production (dist), syntaxWorker.js will be in the same dir as this component
    worker = new Worker(path.join(__dirname, 'syntaxWorker.js'));
    worker.on('message', (msg) => {
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)!(msg.highlightedText || msg.text || '');
        callbacks.delete(msg.id);
      }
    });
  }
  return worker;
}

interface MarkdownWorkerProps {
  content: string;
}

export const MarkdownWorker: React.FC<MarkdownWorkerProps> = ({ content }) => {
  const [highlighted, setHighlighted] = useState(content);

  useEffect(() => {
    if (!content) return;
    
    const id = `msg_${messageIdCounter++}`;
    
    callbacks.set(id, (result) => {
      setHighlighted(result);
    });
    
    getWorker().postMessage({ text: content, id });
    
  }, [content]);

  return <Text>{highlighted}</Text>;
};
