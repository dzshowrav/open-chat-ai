import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { BUILT_IN_COMMANDS } from '../../core/constants.js';
import { themeManager } from '../theme/themeManager.js';
import { AppState } from '../../core/state.js';

interface CommandPaletteProps {
  query: string;
  state: AppState;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ query, state, onSelect, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { stdout } = useStdout();

  // Responsive width — clamp between 36 and 72 cols, leaving 4 col margin
  const termWidth = stdout?.columns ?? 80;
  const paletteWidth = Math.min(72, Math.max(36, termWidth - 4));
  const isNarrow = paletteWidth < 52;

  const filtered = BUILT_IN_COMMANDS.filter(cmd =>
    cmd.command.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useInput((_input: string, key: any) => {
    if (key.escape) { onClose(); return; }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (filtered[selectedIndex]) onSelect(filtered[selectedIndex].command);
      return;
    }
  });

  if (filtered.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1} paddingY={0} width={paletteWidth}>
        <Text color="red" bold>No commands found for "{query}"</Text>
        <Text color="gray">Press ESC to close</Text>
      </Box>
    );
  }

  const maxItems = 4;
  let startIndex = 0;
  if (filtered.length > maxItems) {
    if (selectedIndex >= maxItems) {
      startIndex = selectedIndex - maxItems + 1;
    }
  }
  const visibleCommands = filtered.slice(startIndex, startIndex + maxItems);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.accentColor} paddingX={1} paddingY={0} width={paletteWidth}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color={theme.accentColor} bold>⌘ Commands</Text>
        <Box flexDirection="row">
          {startIndex > 0 && <Text color="cyan">↑ </Text>}
          {query && <Text color="gray">filter: {query}</Text>}
        </Box>
      </Box>

      {/* Command list */}
      <Box flexDirection="column">
        {visibleCommands.map((cmd, localIdx) => {
          const globalIdx = startIndex + localIdx;
          const isSelected = globalIdx === selectedIndex;
          const icon = isSelected ? '▶ ' : '  ';
          const isUpdateCmd = cmd.command === '/update latest';
          const showUpdateIcon = isUpdateCmd && state.isUpdateAvailable;

          return (
            <Box key={cmd.command} flexDirection="column" paddingX={1} paddingY={0}>
              {isNarrow ? (
                // Narrow: stack command and usage vertically
                <Box flexDirection="column">
                  <Text color={theme.primaryColor} inverse={isSelected}>
                    {icon}{cmd.command}{showUpdateIcon && <Text color="#f7768e" bold>{" \u{F01E}"}</Text>}
                  </Text>
                  <Box paddingLeft={2}>
                    <Text color="gray" inverse={isSelected}>
                      {cmd.description}
                    </Text>
                  </Box>
                </Box>
              ) : (
                // Wide: command + usage on one row, description below
                <Box flexDirection="column">
                  <Box flexDirection="row" justifyContent="space-between">
                    <Text color={theme.primaryColor} inverse={isSelected}>
                      {icon}{cmd.command}{showUpdateIcon && <Text color="#f7768e" bold>{" \u{F01E}"}</Text>}
                    </Text>
                    <Text color="gray" italic inverse={isSelected}>
                      {cmd.usage}
                    </Text>
                  </Box>
                  <Box paddingLeft={3}>
                    <Text color="gray" inverse={isSelected}>
                      {cmd.description}
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Footer hint */}
      <Box marginTop={1} flexDirection="row" justifyContent="space-between">
        <Text color="gray">↑↓ nav  ENTER sel  ESC cls</Text>
        {startIndex + maxItems < filtered.length && <Text color="cyan">↓</Text>}
      </Box>
    </Box>
  );
};
