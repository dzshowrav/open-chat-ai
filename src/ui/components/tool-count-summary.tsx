import React from 'react';
import { Box, Text } from 'ink';

export const ToolCountSummary: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 1) return null;
  
  return (
    <Box flexDirection="row" marginY={0.5}>
      <Box borderStyle="single" borderColor="#81a1c1" paddingX={1}>
        <Text color="#81a1c1" bold>⚡ {count} Parallel Actions Grouped</Text>
      </Box>
    </Box>
  );
};
