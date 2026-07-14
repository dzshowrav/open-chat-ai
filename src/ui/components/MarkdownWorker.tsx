/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  MarkdownWorker — High-Performance Off-Thread Renderer          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Design goals:
 *  1. ZERO main-thread blocking — all heavy lifting in Worker thread
 *  2. Buttery smooth streaming — renders instantly as tokens arrive
 *  3. Singleton worker pool — never leaks threads
 *  4. Debounced rapid-fire updates — batches tokens, avoids render storms
 *  5. Graceful fallback — raw text rendered if worker fails or times out
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, useStdout } from 'ink';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { themeManager } from '../theme/themeManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Worker Pool Singleton ────────────────────────────────────────────────────
// One worker thread reused across every MarkdownWorker component instance.
// This avoids spawning N threads for N messages in the chat history.

interface PendingCallback {
  resolve: (rendered: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

let _worker: Worker | null = null;
let _workerFailed = false;
let _msgCounter = 0;
const _pending = new Map<string, PendingCallback>();

// ─── Timeout for a single render job (ms) ────────────────────────────────────
const JOB_TIMEOUT_MS = 3000;

/**
 * Get or create the singleton worker.
 * Returns null if the worker previously failed (so we degrade gracefully).
 */
function getWorker(): Worker | null {
  if (_workerFailed) return null;
  if (_worker) return _worker;

  try {
    // In production dist/, syntaxWorker.js lives beside this file
    const workerPath = path.join(__dirname, 'syntaxWorker.js');
    _worker = new Worker(workerPath);

    _worker.on('message', (msg: {
      id: string;
      rendered?: string;
      error?: string;
    }) => {
      const pending = _pending.get(msg.id);
      if (!pending) return;

      clearTimeout(pending.timer);
      _pending.delete(msg.id);
      pending.resolve(msg.rendered ?? '');
    });

    _worker.on('error', (err: unknown) => {
      // Worker crashed — drain all pending with raw text fallback
      console.error('[MarkdownWorker] Worker error:', err instanceof Error ? err.message : String(err));
      _workerFailed = true;
      _worker = null;
      for (const [, cb] of _pending) {
        clearTimeout(cb.timer);
      }
      _pending.clear();
    });

    _worker.on('exit', (code) => {
      if (code !== 0) {
        _workerFailed = true;
        _worker = null;
      }
    });

    return _worker;
  } catch (err: any) {
    console.error('[MarkdownWorker] Failed to spawn worker:', err.message);
    _workerFailed = true;
    return null;
  }
}

/**
 * Submit text to the worker for highlighting.
 * Returns a Promise that resolves with the ANSI-colored output.
 * Falls back to raw text if worker is unavailable or times out.
 */
function renderAsync(
  text: string,
  partial: boolean,
  themeColors: { primary: string; accent: string },
  columns: number
): Promise<string> {
  return new Promise<string>((resolve) => {
    const worker = getWorker();
    if (!worker) {
      // Worker not available — resolve immediately with raw text
      resolve(text);
      return;
    }

    const id = `m${_msgCounter++}`;

    // Safety timeout: never let UI wait more than JOB_TIMEOUT_MS
    const timer = setTimeout(() => {
      _pending.delete(id);
      resolve(text); // fallback to raw
    }, JOB_TIMEOUT_MS);

    _pending.set(id, { resolve, timer });

    worker.postMessage({ id, text, partial, themeColors, columns });
  });
}

// ─── React Component ──────────────────────────────────────────────────────────

export interface MarkdownWorkerProps {
  /** The raw Markdown content to render */
  content: string;
  /**
   * Set to true while the AI is still streaming this message.
   * The worker will render partial/unclosed code blocks gracefully.
   */
  isStreaming?: boolean;
}

/**
 * MarkdownWorker
 *
 * Renders Markdown + syntax-highlighted code using a background worker thread.
 * The main React/Ink thread is NEVER blocked by highlighting computations.
 *
 * Usage:
 *   <MarkdownWorker content={msg.content} isStreaming={state.isStreaming} />
 */
export const MarkdownWorker: React.FC<MarkdownWorkerProps> = ({
  content,
  isStreaming = false,
}) => {
  const { stdout } = useStdout();
  const columns = stdout?.columns || 80;

  // Displayed output — starts as the raw content (instant first paint)
  const [rendered, setRendered] = useState<string>(content);

  // Debounce timer ref — prevent render storms during fast streaming
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the content version — prevent stale async responses from overwriting newer state
  const contentVersion = useRef<number>(0);

  const scheduleRender = useCallback(
    (text: string, partial: boolean, version: number, cols: number) => {
      const theme = themeManager.getCurrentTheme();
      const themeColors = { 
        primary: theme.primaryColor, 
        accent: theme.accentColor,
        textColor: theme.textColor,
        backgroundColor: theme.backgroundColor,
        darkMode: theme.darkMode
      };
      renderAsync(text, partial, themeColors, cols).then((result) => {
        // Only apply if we're still on the same version (content hasn't changed)
        if (version === contentVersion.current) {
          setRendered(result);
        }
      });
    },
    []
  );

  useEffect(() => {
    if (!content) {
      setRendered('');
      return;
    }

    // Bump version to invalidate any in-flight older renders
    const version = ++contentVersion.current;

    // Immediate optimistic update — show raw content right away
    // This ensures zero-latency first paint while worker processes in bg
    setRendered(content);

    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (isStreaming) {
      // During active streaming: debounce aggressively (50ms)
      // so we're not overwhelming the worker with every single token
      debounceTimer.current = setTimeout(() => {
        scheduleRender(content, true, version, columns);
      }, 50);
    } else {
      // Message is complete: render immediately (no debounce)
      scheduleRender(content, false, version, columns);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [content, isStreaming, scheduleRender, columns]);

  return <Text wrap="wrap">{rendered}</Text>;
};

/**
 * Gracefully terminate the singleton worker.
 * Call this on app exit to avoid hanging processes.
 */
export function terminateMarkdownWorker(): void {
  if (_worker) {
    _worker.terminate();
    _worker = null;
  }
  for (const [, cb] of _pending) {
    clearTimeout(cb.timer);
  }
  _pending.clear();
}
