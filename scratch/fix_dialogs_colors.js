import fs from 'fs';

const filePath = 'src/ui/screens/Dialogs.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace `#8e9aa8` with `"gray"` or `'gray'`
const hexBeforeCount = (content.match(/#8e9aa8/g) || []).length;
content = content.replace(/#8e9aa8/g, 'gray');

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Successfully replaced ${hexBeforeCount} occurrences of #8e9aa8 with gray!`);
