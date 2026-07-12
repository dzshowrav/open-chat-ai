import React from 'react';
import { render, Box, Text } from 'ink';

const TestApp = () => {
  const theme = {
    primaryColor: "cyan",
    accentColor: "magenta",
    darkMode: true
  };
  const messageBorderColor = theme.darkMode ? '#3b4261' : '#cbd5e1';

  return React.createElement(
    Box,
    {
      flexDirection: "column",
      paddingLeft: 2,
      marginY: 1
    },
    // Assistant message inside a round border box (Compact Padding)
    React.createElement(
      Box,
      {
        flexDirection: "column",
        marginY: 0.5,
        borderStyle: "round",
        borderColor: messageBorderColor,
        paddingLeft: 1,  // 1 space padding left
        paddingRight: 1, // 1 space padding right
        paddingTop: 0,
        paddingBottom: 0
      },
      React.createElement(
        Box,
        { flexDirection: "column", marginLeft: 0 },
        React.createElement(Text, { color: "#7aa2f7", bold: true }, "● Thinking Process"),
        React.createElement(Box, { marginLeft: 1 }, 
          React.createElement(Text, { color: "#80d4ff", italic: true }, "The user is just saying hello again. Let me respond warmly and see if they have a task they'd like to work on.")
        )
      ),
      React.createElement(
        Box,
        { flexDirection: "row", marginLeft: 0, marginTop: 0.5 },
        React.createElement(Box, { marginRight: 1 }, 
          React.createElement(Text, { color: theme.accentColor, bold: true }, "●")
        ),
        React.createElement(Box, { flexShrink: 1, flexGrow: 1 }, 
          React.createElement(Text, null, "Hi again! Hope you're doing well. I'm loaded up with all the skills and tools we need — whether it's coding, debugging, architecture diagrams, managing repos, or setting up automation, I'm ready. Got something in mind you'd like to tackle?")
        )
      )
    )
  );
};

render(React.createElement(TestApp));
