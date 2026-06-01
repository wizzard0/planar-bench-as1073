import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { EXCLUDED_SET } from "./excluded-models.ts";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const db = new Database("out/results.sqlite", { create: true });

const query = `
  SELECT acc, model, duration
  FROM top_models
  ORDER BY acc DESC
`;

const rows = db.query(query).all() as {acc:number, model:string, duration:number}[];

let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Benchmark Results</title>
<style>
table { border-collapse: collapse; }
th, td { border: 1px solid #ccc; padding: 4px 8px; }
</style>
</head>
<body>
<h1>Benchmark Results</h1>
<table>
<thead><tr><th>Solved</th><th>Model</th><th>Seconds</th></tr></thead>
<tbody>
`;
for(const row of rows){
  if (EXCLUDED_SET.has(row.model)) continue;
  html += `<tr><td>${row.acc}</td><td>${escapeHtml(row.model)}</td><td>${row.duration}</td></tr>\n`;
}
html += `</tbody>
</table>
</body>
</html>
`;

mkdirSync("out/web", { recursive: true });
writeFileSync("out/web/bench.html", html);

console.log("wrote out/web/bench.html");
