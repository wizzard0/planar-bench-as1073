export function extractBlock(text: string): string[] {
  // extract ```-enclosed code blocks
  let lines = text.split('\n');
  let inBlock = false;
  let linesInBlock = [];
  for (let line of lines) {
    if (line.startsWith('```')) {
      if(!inBlock){
        linesInBlock = []; // discard everything except the last block
      }
      inBlock = !inBlock;
      continue;
    }
    if (inBlock) {
      linesInBlock.push(line);
    }
  }
  // clean whitespace
  linesInBlock = linesInBlock.filter(l => l.trim().length > 0);
  return linesInBlock;
}