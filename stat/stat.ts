import {Database} from "bun:sqlite";

export interface SingleGraphRunResult{
  dur:number
  model:string
  index:number
  vertices:number
  valid:number
  error:string
  time:string // when the run was started
  matrix:string
  prompt:string
  http_code:number
  http_error:string
  provider:string
  reply:string
  version:string
}

export interface AlmostRun{
  id:number
  duration:number
  model:string
  graph_index:number
  num_vertices:number
  is_valid:number
  error_msg:string
  added:string
  matrix_dump:string
  prompt:string
  http_code:number
  http_error:string
  provider:string
  reply:string
  version:string
}

const db = new Database("out/results.sqlite", { create: true });

// Create table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS graph_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  duration REAL NOT NULL,
  model TEXT NOT NULL,
  graph_index INTEGER NOT NULL,
  num_vertices INTEGER NOT NULL,
  is_valid INTEGER NOT NULL,
  error_msg TEXT,
  added TEXT NOT NULL,
  matrix_dump TEXT,
  prompt TEXT,
  http_code INTEGER,
  http_error TEXT,
  provider TEXT,
  reply TEXT,
  version TEXT
)`);

export function writeStatPoint(result: SingleGraphRunResult): void {
  const stmt = db.prepare(`
    INSERT INTO graph_runs (
      duration, model, graph_index, num_vertices, 
      is_valid, error_msg, added, matrix_dump,
      prompt, http_code, http_error, provider, reply, version
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for(let retry=0;retry<5;retry++) {
    try {
      stmt.run(
        result.dur,
        result.model,
        result.index,
        result.vertices,
        result.valid,
        result.error || null,
        result.time,
        result.matrix,
        result.prompt,
        result.http_code,
        result.http_error || null,
        result.provider,
        result.reply,
        result.version,
      );
      break;
    }catch (e:any){
      // if the database is locked, retry
      if(e.message.includes("database is locked")) {
        console.log("retrying db write");

        continue;
      }else{
        throw e;
      }
    }
  }
}

/**
 * find last run for a given graph index and model
 * @param i
 * @param model
 */
export function findRun(i: number, model: string): AlmostRun {
  let q= db.query(`SELECT * FROM graph_runs WHERE graph_index = ? AND model = ? ORDER BY id DESC LIMIT 1`).get(i, model);
//  console.log(q);
  return q as AlmostRun;
}