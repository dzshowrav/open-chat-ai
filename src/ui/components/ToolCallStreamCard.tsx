/**
 * ToolCallStreamCard.tsx
 *
 * Displays an in-progress tool call during streaming.
 * Follows the article's pattern of showing a clean bordered card
 * for each tool call as it's being built up in real-time.
 *
 * Lifecycle: start → delta (×N) → end
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { eventBus } from '../../core/events.js';
import { themeManager } from '../theme/themeManager.js';

interface ToolCallData {
  index: number;
  toolName: string;
  toolId: string;
  partialArgs: string;
  completeArgs: Record<string, any> | null;
  status: 'building' | 'complete';
}

export const ToolCallStreamCard: React.FC = () => {
  const theme = themeManager.getCurrentTheme();
  const [toolCalls, setToolCalls] = useState<ToolCallData[]>([]);
  const [tick, setTick] = useState(0);

  // Animation tick for running spinners
  useEffect(() => {
    const hasActive = toolCalls.some(tc => tc.status === 'building');
    if (!hasActive) return;
    const interval = setInterval(() => setTick(t => t + 1), 150);
    return () => clearInterval(interval);
  }, [toolCalls]);

  useEffect(() => {
    const handleStart = (payload: { index: number; toolName: string; toolId: string }) => {
      setToolCalls(prev => {
        // Don't add duplicate
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

    const handleEnd = (payload: { index: number; completeArgs: Record<string, any>; toolName: string; toolId: string }) => {
      setToolCalls(prev =>
        prev.map(tc => {
          if (tc.index !== payload.index) return tc;
          return { ...tc, completeArgs: payload.completeArgs, status: 'complete' };
        })
      );
    };

    eventBus.on('stream:tool_call_start', handleStart);
    eventBus.on('stream:tool_call_delta', handleDelta);
    eventBus.on('stream:tool_call_end', handleEnd);

    return () => {
      eventBus.off('stream:tool_call_start', handleStart);
      eventBus.off('stream:tool_call_delta', handleDelta);
      eventBus.off('stream:tool_call_end', handleEnd);
    };
  }, []);

  if (toolCalls.length === 0) return null;

  const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const cardBorderColor = theme.darkMode ? '#3b4261' : '#cbd5e1';

  return (
    <Box flexDirection="column" marginY={0.5} paddingX={1}>
      {toolCalls.map(tc => {
        const isBuilding = tc.status === 'building';
        const spinnerChar = spinners[tick % spinners.length];
        // Extract nice name for display
        const niceName = tc.toolName
          .replace(/_file|_process|_content/gi, '')
          .replace(/_/g, ' ');
        const displayName = niceName.charAt(0).toUpperCase() + niceName.slice(1);

        // Try to extract a key argument for display
        let targetDisplay = '';
        if (tc.completeArgs) {
          targetDisplay = String(
            tc.completeArgs.path || tc.completeArgs.url || tc.completeArgs.query ||
            tc.completeArgs.command || tc.completeArgs.TargetFile || tc.completeArgs.DirectoryPath || ''
          );
        }

        // Show partial args preview during building
        let argsPreview = '';
        if (isBuilding && tc.partialArgs) {
          // Clean up the accumulating JSON for display
          const cleaned = tc.partialArgs
            .replace(/^{"/, '')
            .replace(/"}$/, '')
            .slice(0, 50);
          if (cleaned) argsPreview = cleaned;
        }

        return (
          <Box
            key={tc.index}
            flexDirection="column"
            borderStyle="round"
            borderColor={isBuilding ? '#e0af68' : '#a3be8c'}
            paddingX={1}
            paddingY={0}
            marginY={0.3}
            width={60}
          >
            <Box flexDirection="row" alignItems="center">
              <Text color={isBuilding ? '#e0af68' : '#a3be8c'} bold>
                {isBuilding ? `${spinnerChar} ` : '● '}
              </Text>
              <Text color={isBuilding ? '#e0af68' : '#a3be8c'} bold>
                {isBuilding ? `Called ${displayName}` : `Called ${displayName}`}
              </Text>
            </Box>

            {targetDisplay && targetDisplay.length > 0 && (
              <Box marginLeft={2} marginTop={0}>
                <Text color={theme.primaryColor} dimColor>
                  {targetDisplay.length > 50
                    ? `📁 ${targetDisplay.slice(0, 25)}...${targetDisplay.slice(-20)}`
                    : `📁 ${targetDisplay}`}
                </Text>
              </Box>
            )}

            {isBuilding && argsPreview && !targetDisplay && (
              <Box marginLeft={2} marginTop={0}>
                <Text color="gray" italic>
                  {argsPreview}...
                </Text>
              </Box>
            )}

            {isBuilding && !argsPreview && !targetDisplay && (
              <Box marginLeft={2} marginTop={0}>
                <Text color="gray" italic>Building arguments...</Text>
              </Box>
            )}

            {tc.status === 'complete' && (
              <Box marginLeft={2} marginTop={0}>
                <Text color="#a3be8c">✔ Executed successfully</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
