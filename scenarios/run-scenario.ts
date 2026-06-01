// for each graph, draw, validate, make markdown.

import * as fs from "node:fs";
import {processOne} from "./process-one.ts";
import {makeConsoleLike} from "./console-like.ts";
import {getGitCommitDateUTC} from "../stat/git-commit.ts";
import {findRun} from "../stat/stat.ts";

function updateTerminalTitle(title: string) {
  if (!process.stdout.isTTY) {
    return;
  }
  process.stdout.write(`\u001B]0;${title}\u0007`);
}

async function processSequence() {
  let model = process.argv[2] || 'o3-mini';
  let mod = +(process.argv[4] || '1');
  let runner = +(process.argv[5] || '0');
  let destPath = `out/${model}.md`;
  let console = makeConsoleLike(destPath);
  let ver = await getGitCommitDateUTC();
  console.log(`as1073: ${ver}\n`);
  let numGraphs = parseInt(process.argv[3]) || 11;
  fs.rmSync(destPath, {force: true});
  console.log(`## model: ${model}\n`);
  if (process.env.ONE) {
    updateTerminalTitle(`as1073: graph ${process.env.ONE} (${model})`);
    await processOne(+process.env.ONE, destPath, model, ver)
  } else {
    for (let i = 1 + runner; i < numGraphs; i++) {
      if ((i % mod) !== runner) {
        console.log('skip', (i % mod), runner)
        continue // skip parallel runs
        // use 100 2 0, 100 2 1 for parallel
      }
      let lastExistingRun = findRun(i, model);
      if (lastExistingRun?.http_code === 200) {
        console.log(`skipping ${i} as it was already processed`);
        continue;
      }
      updateTerminalTitle(`as1073: graph ${i} (${model})`);
      await processOne(i, destPath, model, ver);
    }
  }
  updateTerminalTitle(`as1073: complete (${model})`);
}

await processSequence();
