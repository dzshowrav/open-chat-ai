import React from 'react';
import { render, Text, useInput } from 'ink';
import fs from 'fs';

const TestApp: React.FC = () => {
  useInput((input, key) => {
    const log = `input=${JSON.stringify(input)} up=${!!key.upArrow} down=${!!key.downArrow} left=${!!key.leftArrow} right=${!!key.rightArrow}\n`;
    fs.appendFileSync('/tmp/inktest.log', log);
  });

  return <Text>Arrow key test running... Press arrows. Ctrl+C to exit.</Text>;
};

render(<TestApp />);
