import fs from 'fs';

const filePath = 'src/ui/screens/ChatScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace paddingY with paddingTop and paddingBottom in MessageItem assistant Box
const searchBlock1 = `      <Box 
        key={idx} 
        flexDirection="column" 
        marginY={isMobile ? 0.1 : 0.5} 
        paddingX={isMobile ? 1 : 2}
        paddingY={isMobile ? 0.2 : 0.5}
        borderStyle="round"
        borderColor={cardBorderColor}
      >`;

const replaceBlock1 = `      <Box 
        key={idx} 
        flexDirection="column" 
        marginY={isMobile ? 0.1 : 0.5} 
        paddingX={isMobile ? 1 : 2}
        paddingTop={0}
        paddingBottom={isMobile ? 0 : 1}
        borderStyle="round"
        borderColor={cardBorderColor}
      >`;

if (content.includes(searchBlock1)) {
  content = content.replace(searchBlock1, replaceBlock1);
  console.log("Updated MessageItem assistant Box padding.");
} else {
  console.error("searchBlock1 not found!");
}

// Replace paddingY with paddingTop and paddingBottom in StreamingResponse Box
const searchBlock2 = `    <Box 
      flexDirection="column" 
      marginY={isMobile ? 0.1 : 0.5} 
      paddingX={isMobile ? 1 : 2}
      paddingY={isMobile ? 0.2 : 0.5}
      borderStyle="round"
      borderColor={cardBorderColor}
    >`;

const replaceBlock2 = `    <Box 
      flexDirection="column" 
      marginY={isMobile ? 0.1 : 0.5} 
      paddingX={isMobile ? 1 : 2}
      paddingTop={0}
      paddingBottom={isMobile ? 0 : 1}
      borderStyle="round"
      borderColor={cardBorderColor}
    >`;

if (content.includes(searchBlock2)) {
  content = content.replace(searchBlock2, replaceBlock2);
  console.log("Updated StreamingResponse Box padding.");
} else {
  console.error("searchBlock2 not found!");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully adjusted paddings in ChatScreen.tsx!");
