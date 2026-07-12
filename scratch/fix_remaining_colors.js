import fs from 'fs';

const files = [
  'src/ui/components/CommandPalette.tsx',
  'src/ui/components/DiffCard.tsx',
  'src/ui/components/shell-submessage-motion.tsx',
  'src/ui/screens/ChatScreen.tsx'
];

for (const filePath of files) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const hexBeforeCount = (content.match(/#8e9aa8/g) || []).length;
    content = content.replace(/#8e9aa8/g, 'gray');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully replaced ${hexBeforeCount} occurrences of #8e9aa8 with gray in ${filePath}!`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
}
