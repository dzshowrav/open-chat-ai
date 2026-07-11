import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const srcDir = './src';

console.log('Scanning src directory for relative imports updates...');
walkDir(srcDir, filePath => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regexp to match relative imports that don't already have extension
    const newContent = content.replace(/(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g, (match, prefix, importPath, suffix) => {
      if (importPath.endsWith('.js') || importPath.endsWith('.css') || importPath.endsWith('.json')) {
        return match;
      }
      
      // Map directory index files specifically
      if (importPath.endsWith('/types') || importPath === './types' || importPath === '../types' || importPath === '../../types') {
        return `${prefix}${importPath}/index.js${suffix}`;
      }
      
      return `${prefix}${importPath}.js${suffix}`;
    });
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated imports in: ${filePath}`);
    }
  }
});

console.log('Relative imports check complete.');
