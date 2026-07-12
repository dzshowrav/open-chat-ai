/**
 * ToolCallStreamCard.tsx
 *
 * Displays an in-progress tool call during streaming WITH live stdout output.
 *
 * Lifecycle:
 *   stream:tool_call_start  →  status='building'   → spinner + args preview
 *   stream:tool_call_end    →  status='ready'       → "Waiting to execute..."
 *   tool:executing          →  status='running'     → spinner + live output
 *   tool:output (×N)       →  append to output buffer
 *   tool:executed           →  status='completed'   → "✅ Done" + output summary
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { eventBus } from '../../core/events.js';
import { themeManager } from '../theme/themeManager.js';

type ToolStatus = 'building' | 'ready' | 'running' | 'completed';

interface ToolCallData {
  index: number;
  toolName: string;
  toolId: string;
  partialArgs: string;
  completeArgs: Record<string, any> | null;
  status: ToolStatus;
  outputLines: string[];
}

export const ToolCallStreamCard: React.FC = () => {
  const theme = themeManager.getCurrentTheme();
  const [toolCalls, setToolCalls] = useState<ToolCallData[]>([]);
  const [tick, setTick] = useState(0);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Animation tick for running spinners
  useEffect(() => {
    const hasActive = toolCalls.some(tc => tc.status === 'building' || tc.status === 'running');
    if (!hasActive) return;
    const interval = setInterval(() => setTick(t => t + 1), 150);
    return () => clearInterval(interval);
  }, [toolCalls]);

  useEffect(() => {
    const handleStart = (payload: { index: number; toolName: string; toolId: string }) => {
      setToolCalls(prev => {
        if (prev.some(tc => tc.index === payload.index)) return prev;
        return [
          ...prev,
          {
            index: payload.index,
            toolName: payload.toolName,
            toolId: payload.toolId,
            partialArgs: '',
            completeArgs: null,
            status: 'building',
            outputLines: [],
          },
        ];
      });
    };

    const handleDelta = (payload: { index: number; partialArgs: string }) => {
      setToolCalls(prev =>
        prev.map(tc => {
          if (tc.index !== payload.index) return tc;
          return { ...tc, partialArgs: tc.partialArgs + payload.partialArgs };
        })
      );
    };

    const handleStreamEnd = (payload: { index: number; completeArgs: Record<string, any>; toolName: string; toolId: string }) => {
      setToolCalls(prev =>
        prev.map(tc => {
          if (tc.index !== payload.index) return tc;
          return { ...tc, completeArgs: payload.completeArgs, status: 'ready' };
        })
      );
    };

    const handleExecuting = (payload: { toolName: string; toolId: string; index: number }) => {
      setToolCalls(prev =>
        prev.map(tc => {
          if (tc.index !== payload.index) return tc;
          return { ...tc, status: 'running', outputLines: [] };
        })
      );
    };

    const handleOutput = (payload: { text: string }) => {
      setToolCalls(prev => {
        // Find the currently running tool call
        const runningIdx = prev.findIndex(tc => tc.status === 'running');
        if (runningIdx === -1) return prev;
        const updated = [...prev];
        const current = { ...updated[runningIdx] };
        // Split by newline and add each line
        const lines = payload.text.split('\n');
        if (current.outputLines.length === 0) {
          current.outputLines = lines.filter(l => l.length > 0);
        } else {
          // Append to last line if it's a continuation
          const lastIdx = current.outputLines.length - 1;
          current.outputLines[lastIdx] += lines[0];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].length > 0) current.outputLines.push(lines[i]);
          }
        }
        // Keep max 20 lines
        if (current.outputLines.length > 20) {
          current.outputLines = current.outputLines.slice(-20);
        }
        updated[runningIdx] = current;
        return updated;
      });
    };

    const handleExecuted = (payload: { toolName: string; toolId: string; index: number; success: boolean }) => {
      setToolCalls(prev =>
        prev.map(tc => {
          if (tc.index !== payload.index) return tc;
          return { ...tc, status: 'completed' };
        })
      );
    };

    eventBus.on('stream:tool_call_start', handleStart);
    eventBus.on('stream:tool_call_delta', handleDelta);
    eventBus.on('stream:tool_call_end', handleStreamEnd);
    eventBus.on('tool:executing', handleExecuting);
    eventBus.on('tool:executed', handleExecuted);
    eventBus.on('tool:output', handleOutput);

    return () => {
      eventBus.off('stream:tool_call_start', handleStart);
      eventBus.off('stream:tool_call_delta', handleDelta);
      eventBus.off('stream:tool_call_end', handleStreamEnd);
      eventBus.off('tool:executing', handleExecuting);
      eventBus.off('tool:executed', handleExecuted);
      eventBus.off('tool:output', handleOutput);
    };
  }, []);

  if (toolCalls.length === 0) return null;

  const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  return (
    <Box flexDirection="column" marginY={0.5} paddingX={1}>
      {toolCalls.map(tc => {
        const isBuilding = tc.status === 'building';
        const isRunning = tc.status === 'running';
        const isReady = tc.status === 'ready';
        const isCompleted = tc.status === 'completed';
        const isActive = isBuilding || isRunning;
        const spinnerChar = spinners[tick % spinners.length];

        // Extract nice name
        const niceName = tc.toolName
          .replace(/_file|_process|_content/gi, '')
          .replace(/_/g, ' ');
        const displayName = niceName.charAt(0).toUpperCase() + niceName.slice(1);

        // Target arg display
        let targetDisplay = '';
        if (tc.completeArgs) {
          targetDisplay = String(
            tc.completeArgs.path || tc.completeArgs.url || tc.completeArgs.query ||
            tc.completeArgs.command || tc.completeArgs.TargetFile || tc.completeArgs.DirectoryPath || ''
          );
        } else if (tc.partialArgs) {
          // Try to extract command from partial args
          try {
            const parsed = JSON.parse('{' + tc.partialArgs.replace(/^\{/, '') + '"}');
            targetDisplay = parsed.command || parsed.path || parsed.url || parsed.query || '';
          } catch {}
        }

        // Color per status
        let borderColor = '#6c7086';
        let statusColor = '#6c7086';
        let statusIcon = '○';
        let statusLabel = '';
        if (isBuilding) {
          borderColor = '#e0af68';
          statusColor = '#e0af68';
          statusIcon = spinnerChar;
          statusLabel = `Calling ${displayName}...`;
        } else if (isReady) {
          borderColor = '#e0af68';
          statusColor = '#e0af68';
          statusIcon = '⏳';
          statusLabel = `Waiting to execute ${displayName}`;
        } else if (isRunning) {
          borderColor = '#61afef';
          statusColor = '#61afef';
          statusIcon = spinnerChar;
          statusLabel = `Running ${displayName}...`;
        } else if (isCompleted) {
          borderColor = '#a3be8c';
          statusColor = '#a3be8c';
          statusIcon = '●';
          statusLabel = `Called ${displayName}`;
        }

        return (
          <Box
            key={tc.index}
            flexDirection="column"
            borderStyle="round"
            borderColor={borderColor}
            paddingX={1}
            paddingY={0}
            marginY={0.3}
            width={60}
          >
            {/* Header row */}
            <Box flexDirection="row" alignItems="center">
              <Text color={statusColor} bold>
                {statusIcon}{' '}
              </Text>
              <Text color={statusColor} bold>
                {statusLabel}
              </Text>
            </Box>

            {/* Target / args display */}
            {targetDisplay && targetDisplay.length > 0 && (isBuilding || isReady) && (
              <Box marginLeft={2} marginTop={0}>
                <Text color={theme.primaryColor} dimColor>
                  {targetDisplay.length > 50
                    ? `📁 ${targetDisplay.slice(0, 25)}...${targetDisplay.slice(-20)}`
                    : `📁 ${targetDisplay}`}
                </Text>
              </Box>
            )}

            {/* Live stdout output (during running) */}
            {isRunning && tc.outputLines.length > 0 && (
              <Box marginLeft={1} marginTop={0} flexDirection="column">
                {tc.outputLines.slice(-8).map((line, li) => (
                  <Text key={li} color="#abb2bf" wrap="truncate-end">
                    {' '}{line.length > 60 ? line.slice(0, 60) + '…' : line}
                  </Text>
                ))}
              </Box>
            )}

            {/* Completed status */}
            {isCompleted && (
              <Box marginLeft={2} marginTop={0} flexDirection="column">
                <Text color="#a3be8c">✔ Done</Text>
                {tc.outputLines.length > 0 && (
                  <Box marginTop={0} flexDirection="column">
                    {tc.outputLines.slice(-3).map((line, li) => (
                      <Text key={li} color="#565f89" italic wrap="truncate-end">
                        {' '}{line.length > 60 ? line.slice(0, 60) + '…' : line}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Waiting indicator */}
            {isReady && (
              <Box marginLeft={2} marginTop={0}>
                <Text color="gray" italic>Queued for execution...</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
