import fs from "node:fs";
import util from "node:util";

export interface Output {
  log: (...messages: any[]) => void;
}

function appendWithNewline(path: string, text: string) {
  console.log(text);
  fs.appendFileSync(path, text + '\n');
}

export function makeConsoleLike(destPath: string): Output {
  return ({
    log: (...messages: any[]) => {
      appendWithNewline(destPath, messages.map(x =>('string'===typeof x)?x: util.inspect(x)).join(' '));
    }
  })
}