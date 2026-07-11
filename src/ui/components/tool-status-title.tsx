import React from 'react';
import { Box, Text } from 'ink';

interface ToolStatusTitleProps {
  toolName: string;
  status?: 'running' | 'success' | 'error';
}

export const ToolStatusTitle: React.FC<ToolStatusTitleProps> = ({ toolName, status = 'running' }) => {
  const color = status === 'running' ? '#e0af68' : (status === 'error' ? '#bf616a' : '#a3be8c');
  const dot = status === 'running' ? '○' : '●';
  
  return (
    <Box flexDirection="row">
      <Text color={color} bold>{dot} </Text>
      <Text color={color}>{toolName}</Text>
    </Box>
  );
};
