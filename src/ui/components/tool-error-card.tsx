import React from 'react';
import { Box, Text } from 'ink';

export const ToolErrorCard: React.FC<{ errorContent: string }> = ({ errorContent }) => {
  const lines = errorContent.split('\n').slice(0, 5);
  const truncated = errorContent.split('\n').length > 5;
  return (
    <Box flexDirection="column" marginLeft={1}>
      <Text color="#bf616a">{lines.join('\n')}{truncated ? '\n...' : ''}</Text>
    </Box>
  );
};
