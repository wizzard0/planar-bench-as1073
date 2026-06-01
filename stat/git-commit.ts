import {getSDF} from "./stupid-sdf.ts";

export async function getGitCommitDateUTC (repoPath:string = ".") :Promise<string> {
  // Get Unix timestamp
  const proc = Bun.spawn(["git", "log", "-1", "--format=%ct-%h"], {
    cwd: repoPath
  });

  const output = await new Response(proc.stdout).text();
  // Convert Unix timestamp (seconds) to milliseconds and create UTC date
  let [timestamp, hash] = output.trim().split("-");
  const tsn = parseInt(timestamp.trim()) * 1000;
  let sdf= getSDF(tsn);
  return `${sdf}-${hash}`;
}