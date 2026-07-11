import React from 'react';
import { Box, Text } from 'ink';
import { Logo } from '../components/Logo.js';
import { themeManager } from '../theme/themeManager.js';
import { AppState } from '../../core/state.js';

interface HomeScreenProps {
  state: AppState;
}

const TIPS = [
  'Type /provider api to configure your base URL and API keys.',
  'Type /add model to register a model associated with a provider.',
  'Type /all models to quickly switch active models and providers.',
  'Type /settings to change color themes or default tool permission levels.',
  'Dangerous tools (like executing shell commands or deleting files) require user permission.',
  'Model Context Protocol (MCP) servers extend available tools automatically.'
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ state }) => {
  const theme = themeManager.getCurrentTheme();

  // Get active tip based on minutes
  const tipIndex = new Date().getMinutes() % TIPS.length;
  const currentTip = TIPS[tipIndex];

  const modelDisplay = state.activeModelId || 'No model loaded (run /add model)';
  const providerDisplay = state.activeProviderId ? 'Connected' : 'No provider configured (run /provider api)';

  return (
    <Box flexDirection="column" paddingX={0} marginY={1}>
      <Logo />
      
      <Box flexDirection="column" borderStyle="double" borderColor={theme.primaryColor} padding={1} marginY={1}>
        <Box flexDirection="row">
          <Text color={theme.accentColor} bold>Current Provider : </Text>
          <Text color="white">{providerDisplay}</Text>
        </Box>
        <Box flexDirection="row">
          <Text color={theme.accentColor} bold>Current Model    : </Text>
          <Text color="white">{modelDisplay}</Text>
        </Box>
        <Box flexDirection="row">
          <Text color={theme.accentColor} bold>Active Workspace : </Text>
          <Text color="white">{state.workspacePath}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="#e0af68" bold>{"\u{F0EB} Pro Tip:"}</Text>
        <Text color="gray" italic>{currentTip}</Text>
      </Box>

      <Box marginY={1}>
        <Text color="gray">Type to ask anything, or press </Text>
        <Text color={theme.primaryColor} bold>/</Text>
        <Text color="gray"> for slash commands.</Text>
      </Box>
    </Box>
  );
};
