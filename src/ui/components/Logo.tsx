import React from 'react';
import { Box, Text } from 'ink';
import { themeManager } from '../theme/themeManager.js';
import { APP_VERSION } from '../../core/constants.js';

export const Logo: React.FC = () => {
  const theme = themeManager.getCurrentTheme();
  
  return (
    <Box flexDirection="column" alignItems="center" marginY={1}>
      <Text color={theme.primaryColor} bold>
        {`
   ____                    _____ _           _   
  / __ \\                  / ____| |         | |  
 | |  | |_ __   ___ _ __ | |    | |__   __ _| |_ 
 | |  | | '_ \\ / _ \\ '_ \\| |    | '_ \\ / _\` | __|
 | |__| | |_) |  __/ | | | |____| | | | (_| | |_ 
  \\____/| .__/ \\___|_| |_|\\_____|_| |_|\\__,_|\\__|
        | |                                      
        |_|                                      
        `}
      </Text>
      <Text color={theme.accentColor} italic>
        Universal AI Coding Agent for Termux • v{APP_VERSION}
      </Text>
    </Box>
  );
};
