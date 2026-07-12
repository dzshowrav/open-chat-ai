import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface ShellMotionProps {
  output: string;
  isActive?: boolean;
}

export const ShellSubmessageMotion: React.FC<ShellMotionProps> = ({ output, isActive = true }) => {
  const lines = (output || '').split('\n').filter(l => l.trim().length > 0);
  const [visibleLines, setVisibleLines] = useState<number>(isActive ? 0 : lines.length);

  useEffect(() => {
    if (!isActive || lines.length === 0) {
      setVisibleLines(lines.length || 1);
      return;
    }
    
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev < lines.length) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 40); // 40ms micro-animation popping in per line
    
    return () => clearInterval(interval);
  }, [lines.length]);

  if (lines.length === 0) {
    return <Text color="gray">No output returned.</Text>;
  }

  return (
    <Box flexDirection="column" paddingLeft={1} borderStyle="single" borderTop={false} borderRight={false} borderBottom={false} borderColor="#4c566a">
      {lines.slice(0, visibleLines).map((line, idx) => (
        <Box key={`shell_${idx}`}>
          <Text >{line}</Text>
        </Box>
      ))}
      {visibleLines < lines.length && (
        <Box>
          <Text color="#81a1c1">...</Text>
        </Box>
      )}
    </Box>
  );
};
