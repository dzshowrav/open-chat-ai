import fs from 'fs';

// 1. Update ChatScreen.tsx (replace #a9b1d6 with gray)
const chatScreenPath = 'src/ui/screens/ChatScreen.tsx';
if (fs.existsSync(chatScreenPath)) {
  let content = fs.readFileSync(chatScreenPath, 'utf8');
  content = content.replace(/color="#a9b1d6"/g, 'color="gray"');
  fs.writeFileSync(chatScreenPath, content, 'utf8');
  console.log(`Optimized contrast in ${chatScreenPath}`);
}

// 2. Update shell-submessage-motion.tsx (remove color="#abb2bf")
const motionPath = 'src/ui/components/shell-submessage-motion.tsx';
if (fs.existsSync(motionPath)) {
  let content = fs.readFileSync(motionPath, 'utf8');
  content = content.replace(/color="#abb2bf"/g, '');
  fs.writeFileSync(motionPath, content, 'utf8');
  console.log(`Optimized contrast in ${motionPath}`);
}

// 3. Update DiffCard.tsx (replace color="#f9fafb" with color={theme.primaryColor})
const diffCardPath = 'src/ui/components/DiffCard.tsx';
if (fs.existsSync(diffCardPath)) {
  let content = fs.readFileSync(diffCardPath, 'utf8');
  content = content.replace(/color="#f9fafb"/g, 'color={theme.primaryColor}');
  fs.writeFileSync(diffCardPath, content, 'utf8');
  console.log(`Optimized contrast in ${diffCardPath}`);
}
