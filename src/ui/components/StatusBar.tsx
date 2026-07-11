import React from 'react';
import { Box, Text } from 'ink';
import { AppState } from '../../core/state.js';
import { themeManager } from '../theme/themeManager.js';
import { APP_VERSION } from '../../core/constants.js';
import path from 'path';

interface StatusBarProps {
  state: AppState;
}

export const StatusBar: React.FC<StatusBarProps> = ({ state }) => {
  const theme = themeManager.getCurrentTheme();
  
  // Get short workspace name
  const workspaceName = state.workspacePath 
    ? path.basename(state.workspacePath) || state.workspacePath
    : 'no-workspace';

  const gitDisplay = state.gitBranch ? ` \u{E725} ${state.gitBranch}` : '';
  const modelDisplay = state.activeModelId || 'No Model';
  const toolDisplay = state.activeToolName ? ` \u{F013} ${state.activeToolName}...` : '';

  return (
    <Box 
      width="100%" 
      borderStyle="single" 
      borderColor={theme.primaryColor}
      flexDirection="row" 
      justifyContent="space-between" 
      paddingX={1}
    >
      <Box>
        <Text color={theme.primaryColor} bold>{"\u{F024B} "}{workspaceName}</Text>
        {state.gitBranch && (
          <Text color="#f7768e" bold>{gitDisplay}</Text>
        )}
        {state.activeToolName && (
          <Text color="#e0af68" bold>{toolDisplay}</Text>
        )}
      </Box>
      
      <Box>
        <Text color={theme.accentColor} bold>
          {"\u{F06A9} "}{modelDisplay}
        </Text>
        <Text color="#9ece6a"> • {state.contextUsagePercent}%</Text>
        {state.mcpCount > 0 && (
          <Text color="#73daca"> • {state.mcpCount} MCP</Text>
        )}
      </Box>
      
      <Box>
        {state.isUpdateAvailable ? (
          <Text color="#9ece6a" bold>v{APP_VERSION} (Update Available!)</Text>
        ) : (
          <Text color="gray">v{APP_VERSION}</Text>
        )}
      </Box>
    </Box>
  );
};
