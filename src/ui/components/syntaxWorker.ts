import { parentPort } from 'worker_threads';
import { highlight } from 'cli-highlight';

parentPort?.on('message', (message: { text: string; id: string }) => {
  try {
    const { text, id } = message;
    
    // Regex to match markdown code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    const highlightedText = text.replace(codeBlockRegex, (match, lang, code) => {
      try {
        if (lang) {
          const coloredCode = highlight(code, { language: lang, ignoreIllegals: true });
          return `\n=== [${lang.toUpperCase()}] ===\n${coloredCode}\n==================\n`;
        } else {
          return `\n=== [CODE] ===\n${code}\n==============\n`;
        }
      } catch {
        return match;
      }
    });
    
    parentPort?.postMessage({ id, highlightedText });
  } catch (err: any) {
    parentPort?.postMessage({ id: message.id, error: err.message, highlightedText: message.text });
  }
});
