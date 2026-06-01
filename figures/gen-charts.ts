import {planarGraphByNumber} from "../graphs/planar.ts";
import {loadEdgeMap} from "../graphs/load-edge-map.ts";
import {EXCLUDED_SET} from "../stat/excluded-models.ts";
import {Database} from "bun:sqlite";
import fs from "fs";

const db = new Database("out/results.sqlite", {readonly: true});

const exclPlaceholders = [...EXCLUDED_SET].map(() => "?").join(",");
let solveRows = db.query(`
  SELECT graph_index, count(distinct model) as models, avg(score) as rate
  FROM unique_avg
  WHERE model NOT IN (${exclPlaceholders})
  GROUP BY graph_index
`).all(...[...EXCLUDED_SET]) as {graph_index: number, models: number, rate: number}[];
let solveMap: {[k: number]: {rate: number, models: number}} = {};
for (let r of solveRows) {
  solveMap[r.graph_index] = {rate: r.rate, models: r.models};
}

let data: {task: number, v: number, edges: number, sr: number}[] = [];
for (let i = 0; i < 200; i++) {
  let [v, gi] = planarGraphByNumber(i);
  let {map} = await loadEdgeMap(v, gi);
  let edges = 0;
  for (let n in map) edges += map[n].length;
  if (solveMap[i] === undefined) continue;
  data.push({task: i, v, edges, sr: solveMap[i].rate});
}

// --- Chart 1: Mean solve rate by edge count (bar chart) ---
let byE: {[k: number]: number[]} = {};
for (let d of data) {
  if (!byE[d.edges]) byE[d.edges] = [];
  byE[d.edges].push(d.sr);
}

let edgeBins = Object.keys(byE).map(Number).sort((a, b) => a - b);
let edgeData = edgeBins.map(e => {
  let arr = byE[e];
  let mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  let variance = arr.length > 1 ? arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length - 1) : 0;
  let se = Math.sqrt(variance / arr.length);
  let ciLo = Math.max(0, mean - 1.96 * se);
  let ciHi = Math.min(1, mean + 1.96 * se);
  return {edges: e, n: arr.length, mean, se, ciLo, ciHi};
});

const W = 640, H = 320;
const margin = {top: 40, right: 30, bottom: 60, left: 70};
const pw = W - margin.left - margin.right;
const ph = H - margin.top - margin.bottom;

function chart1() {
  let barW = pw / edgeData.length - 4;
  let maxY = 1.0;

  let bars = edgeData.map((d, i) => {
    let x = margin.left + i * (pw / edgeData.length) + 2;
    let barH = (d.mean / maxY) * ph;
    let y = margin.top + ph - barH;
    let cx = x + barW / 2;
    let color = `hsl(${210 - d.edges * 15}, 70%, ${45 + d.edges * 2}%)`;
    let errorBar = "";
    if (d.n > 1 && d.se > 0) {
      let yLo = margin.top + ph - (d.ciHi / maxY) * ph;
      let yHi = margin.top + ph - (d.ciLo / maxY) * ph;
      let capW = 6;
      errorBar = `
  <line x1="${cx}" y1="${yLo}" x2="${cx}" y2="${yHi}" stroke="#444" stroke-width="1.2"/>
  <line x1="${cx - capW}" y1="${yLo}" x2="${cx + capW}" y2="${yLo}" stroke="#444" stroke-width="1.2"/>
  <line x1="${cx - capW}" y1="${yHi}" x2="${cx + capW}" y2="${yHi}" stroke="#444" stroke-width="1.2"/>`;
    }
    let label = d.n > 1 ? `${(d.mean * 100).toFixed(0)}%` : `${(d.mean * 100).toFixed(0)}%*`;
    let labelY = d.n > 1 && d.se > 0 ? Math.min(y, margin.top + ph - (d.ciHi / maxY) * ph) - 6 : y - 6;
    return `  <rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="2"/>${errorBar}
  <text x="${cx}" y="${labelY}" text-anchor="middle" font-size="11" fill="#333">${label}</text>
  <text x="${cx}" y="${margin.top + ph + 16}" text-anchor="middle" font-size="11" fill="#555">${d.edges}</text>
  <text x="${cx}" y="${margin.top + ph + 30}" text-anchor="middle" font-size="9" fill="#999">n=${d.n}</text>`;
  }).join("\n");

  let yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  let grid = yTicks.map(t => {
    let y = margin.top + ph - (t / maxY) * ph;
    return `  <line x1="${margin.left}" y1="${y}" x2="${W - margin.right}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5"/>
  <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${(t * 100).toFixed(0)}%</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="24" text-anchor="middle" font-size="15" font-weight="600" fill="#222">Mean Score by Edge Count</text>
  <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#666">Edge count</text>
  <text x="16" y="${H / 2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90 16 ${H / 2})">Score (across all models)</text>
${grid}
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + ph}" stroke="#333" stroke-width="1"/>
  <line x1="${margin.left}" y1="${margin.top + ph}" x2="${W - margin.right}" y2="${margin.top + ph}" stroke="#333" stroke-width="1"/>
${bars}
</svg>`;
}

// --- Chart 2: Scatter plot — edges vs solve rate per task, colored by vertex count ---
function chart2() {
  let maxE = Math.max(...data.map(d => d.edges));
  let maxY = 1.0;
  let colors: {[k: number]: string} = {
    1: "#bbb", 2: "#999",
    3: "#4e79a7", 4: "#f28e2b", 5: "#e15759",
    6: "#76b7b2", 7: "#59a14f"
  };

  let points = data.map(d => {
    let x = margin.left + ((d.edges - 0) / (maxE + 1)) * pw;
    let y = margin.top + ph - (d.sr / maxY) * ph;
    let c = colors[d.v] || "#999";
    return `  <circle cx="${x}" cy="${y}" r="3.5" fill="${c}" opacity="0.65"/>`;
  }).join("\n");

  let yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  let grid = yTicks.map(t => {
    let y = margin.top + ph - (t / maxY) * ph;
    return `  <line x1="${margin.left}" y1="${y}" x2="${W - margin.right}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5"/>
  <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${(t * 100).toFixed(0)}%</text>`;
  }).join("\n");

  let xTicks = Array.from({length: maxE + 1}, (_, i) => i).filter(i => i >= 1);
  let xGrid = xTicks.map(t => {
    let x = margin.left + ((t - 0) / (maxE + 1)) * pw;
    return `  <line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + ph}" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="${x}" y="${margin.top + ph + 16}" text-anchor="middle" font-size="11" fill="#666">${t}</text>`;
  }).join("\n");

  let legendItems = [3, 4, 5, 6, 7].map((v, i) => {
    let lx = W - margin.right - 100;
    let ly = margin.top + 14 + i * 18;
    return `  <circle cx="${lx}" cy="${ly}" r="4" fill="${colors[v]}"/>
  <text x="${lx + 10}" y="${ly + 4}" font-size="11" fill="#444">${v} vertices</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="24" text-anchor="middle" font-size="15" font-weight="600" fill="#222">Task Score vs Edge Count (r = -0.85)</text>
  <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#666">Edge count</text>
  <text x="16" y="${H / 2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90 16 ${H / 2})">Score (across all models)</text>
${grid}
${xGrid}
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + ph}" stroke="#333" stroke-width="1"/>
  <line x1="${margin.left}" y1="${margin.top + ph}" x2="${W - margin.right}" y2="${margin.top + ph}" stroke="#333" stroke-width="1"/>
${points}
${legendItems}
</svg>`;
}

// --- Chart 3: Scatter plot — total time vs solved, per model ---
function chart3() {
  let modelRows = db.query(`SELECT model, acc, duration FROM top_models`).all() as {model: string, acc: number, duration: number}[];
  let models: {name: string, solved: number, seconds: number}[] = [];
  for (let r of modelRows) {
    if (EXCLUDED_SET.has(r.model)) continue;
    models.push({name: r.model, solved: r.acc, seconds: r.duration});
  }

  let W3 = 720, H3 = 368;
  let m3 = {top: 40, right: 30, bottom: 55, left: 70};
  let pw3 = W3 - m3.left - m3.right;
  let ph3 = H3 - m3.top - m3.bottom;

  let maxSolved = 180;
  let maxLogS = Math.log10(250000);
  let minLogS = Math.log10(80);

  let labelSet = new Set([
    "opus-4-5-32k-stream", "gemini3-pro-preview", "gpt-5-codex-high",
    "sonnet-4-5-32k-stream", "gpt-5-2025-08-07", "o1", "deepseek-r1",
    "gpt-5.2-low", "haiku-4-5-32k-stream", "aion-1.0",
    "gpt-4.5-preview", "gpt-4o", "phi-4", "gemma3", "olmo-2",
    "prime-intellect-3", "glm-4.7", "o4-mini",
    "qwen3-next-80b-a3b-thinking", "gpt-5.2-pro-medium",
  ]);

  function toX(seconds: number) {
    let logS = Math.max(minLogS, Math.log10(Math.max(1, seconds)));
    return m3.left + ((logS - minLogS) / (maxLogS - minLogS)) * pw3;
  }
  function toY(solved: number) {
    return m3.top + ph3 - (solved / maxSolved) * ph3;
  }

  let points = models.map(m => {
    let x = toX(m.seconds);
    let y = toY(m.solved);
    let showLabel = labelSet.has(m.name);
    let label = showLabel
      ? `\n  <text x="${x + 5}" y="${y - 5}" font-size="8" fill="#555">${m.name.replace(/-stream$/, "")}</text>`
      : "";
    let color = m.solved >= 50 ? "#4e79a7" : m.solved >= 15 ? "#f28e2b" : "#e15759";
    return `  <circle cx="${x}" cy="${y}" r="${showLabel ? 4 : 3}" fill="${color}" opacity="0.7"/>${label}`;
  }).join("\n");

  let yTicks = [0, 20, 40, 60, 80, 100, 120, 140, 160];
  let yGrid = yTicks.map(t => {
    let y = toY(t);
    return `  <line x1="${m3.left}" y1="${y}" x2="${W3 - m3.right}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5"/>
  <text x="${m3.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${t}</text>`;
  }).join("\n");

  let xTicksLog = [100, 1000, 10000, 100000];
  let xLabels: {[k: number]: string} = {100: "100s", 1000: "1ks", 10000: "10ks", 100000: "100ks"};
  let xGrid = xTicksLog.map(t => {
    let x = toX(t);
    return `  <line x1="${x}" y1="${m3.top}" x2="${x}" y2="${m3.top + ph3}" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="${x}" y="${m3.top + ph3 + 16}" text-anchor="middle" font-size="11" fill="#666">${xLabels[t]}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W3} ${H3}" font-family="system-ui, sans-serif">
  <rect width="${W3}" height="${H3}" fill="white"/>
  <text x="${W3 / 2}" y="24" text-anchor="middle" font-size="15" font-weight="600" fill="#222">Benchmark Score vs Total API Time</text>
  <text x="${W3 / 2}" y="${H3 - 8}" text-anchor="middle" font-size="12" fill="#666">Total API time (log scale)</text>
  <text x="16" y="${H3 / 2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90 16 ${H3 / 2})">Score (of 199)</text>
${yGrid}
${xGrid}
  <line x1="${m3.left}" y1="${m3.top}" x2="${m3.left}" y2="${m3.top + ph3}" stroke="#333" stroke-width="1"/>
  <line x1="${m3.left}" y1="${m3.top + ph3}" x2="${W3 - m3.right}" y2="${m3.top + ph3}" stroke="#333" stroke-width="1"/>
${points}
</svg>`;
}

// --- Chart 4: Scatter plot — release date vs solved, per model ---
function chart4() {
  let relCsv = fs.readFileSync("figures/model-release-dates.csv", "utf8").trim().split("\n").slice(1);
  let topMap: {[k: string]: number} = {};
  for (let r of db.query(`SELECT model, acc FROM top_models`).all() as {model: string, acc: number}[]) {
    topMap[r.model] = r.acc;
  }
  let models: {name: string, solved: number, date: number}[] = [];
  for (let line of relCsv) {
    let [name, , date] = line.split(",");
    if (topMap[name] === undefined || EXCLUDED_SET.has(name)) continue;
    models.push({name, solved: topMap[name], date: +new Date(date + "T00:00:00Z")});
  }

  let W4 = 820, H4 = 460;
  let m4 = {top: 40, right: 30, bottom: 55, left: 70};
  let pw4 = W4 - m4.left - m4.right;
  let ph4 = H4 - m4.top - m4.bottom;

  let maxSolved = 180;
  let minDate = +new Date("2023-10-01T00:00:00Z");
  let maxDate = +new Date("2026-02-01T00:00:00Z");

  function toX(d: number) {
    return m4.left + ((d - minDate) / (maxDate - minDate)) * pw4;
  }
  function toY(s: number) {
    return m4.top + ph4 - (s / maxSolved) * ph4;
  }

  // Pareto frontier + notable off-frontier models
  let labelSet = new Set([
    // Pareto frontier
    "mixtral-8x7b", "gpt-4o", "o1-mini", "o1",
    "sonnet-3-7-0219-32k", "gpt-5-2025-08-07",
    "gpt-5-codex-high", "gemini3-pro-preview", "opus-4-5-32k-stream",
    "gpt-5.2-pro-medium", "gpt-5.2-low", "glm-4.7",
    // notable off-frontier
    "sonnet-4-5-32k-stream", "deepseek-r1", "o4-mini", "o3",
    "haiku-4-5-32k-stream", "phi-4", "olmo-2",
  ]);

  let nudge: {[k: string]: [number, number]} = {
    "gpt-5.2-pro-medium": [5, -8],
    "gpt-5.2-low": [5, 12],
    "glm-4.7": [5, 12],
    "o3": [5, -8],
    "opus-4-5-32k-stream": [5, -8],
    "gemini3-pro-preview": [5, -5],
    "gpt-5-codex-high": [5, -5],
    "gpt-5-2025-08-07": [5, -5],
    "sonnet-4-5-32k-stream": [5, 12],
    "sonnet-3-7-0219-32k": [5, -5],
    "haiku-4-5-32k-stream": [5, 12],
    "o1": [5, -8],
    "o1-mini": [5, -8],
    "o4-mini": [5, 12],
    "deepseek-r1": [5, 12],
    "gpt-4o": [5, -8],
    "phi-4": [5, 12],
    "olmo-2": [5, -8],
    "mixtral-8x7b": [5, -8],
  };

  let points = models.map(m => {
    let x = toX(m.date);
    let y = toY(m.solved);
    let showLabel = labelSet.has(m.name);
    let [dx, dy] = nudge[m.name] || [5, -5];
    let label = showLabel
      ? `\n  <text x="${x + dx}" y="${y + dy}" font-size="8" fill="#555">${m.name.replace(/-stream$/, "").replace(/-2025-08-07/, "")}</text>`
      : "";
    let color = m.solved >= 50 ? "#4e79a7" : m.solved >= 15 ? "#f28e2b" : "#e15759";
    return `  <circle cx="${x}" cy="${y}" r="${showLabel ? 4 : 3}" fill="${color}" opacity="0.7"/>${label}`;
  }).join("\n");

  let yTicks = [0, 20, 40, 60, 80, 100, 120, 140, 160];
  let yGrid = yTicks.map(t => {
    let y = toY(t);
    return `  <line x1="${m4.left}" y1="${y}" x2="${W4 - m4.right}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5"/>
  <text x="${m4.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${t}</text>`;
  }).join("\n");

  let xTicks = ["2024-01", "2024-04", "2024-07", "2024-10", "2025-01", "2025-04", "2025-07", "2025-10", "2026-01"];
  let xGrid = xTicks.map(t => {
    let x = toX(+new Date(t + "-01T00:00:00Z"));
    let label = t.replace(/^20/, "'");
    return `  <line x1="${x}" y1="${m4.top}" x2="${x}" y2="${m4.top + ph4}" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="${x}" y="${m4.top + ph4 + 16}" text-anchor="middle" font-size="11" fill="#666">${label}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W4} ${H4}" font-family="system-ui, sans-serif">
  <rect width="${W4}" height="${H4}" fill="white"/>
  <text x="${W4 / 2}" y="24" text-anchor="middle" font-size="15" font-weight="600" fill="#222">Benchmark Score vs Model Release Date</text>
  <text x="${W4 / 2}" y="${H4 - 8}" text-anchor="middle" font-size="12" fill="#666">Release date (approximate)</text>
  <text x="16" y="${H4 / 2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90 16 ${H4 / 2})">Score (of 199)</text>
${yGrid}
${xGrid}
  <line x1="${m4.left}" y1="${m4.top}" x2="${m4.left}" y2="${m4.top + ph4}" stroke="#333" stroke-width="1"/>
  <line x1="${m4.left}" y1="${m4.top + ph4}" x2="${W4 - m4.right}" y2="${m4.top + ph4}" stroke="#333" stroke-width="1"/>
${points}
</svg>`;
}

// --- Chart 5: Sum of edges across solved tasks vs release date ---
function chart5() {
  let edgeCountByTask: {[k: number]: number} = {};
  for (let d of data) edgeCountByTask[d.task] = d.edges;

  let scoreByModelTask = db.query(`
    SELECT model, graph_index, score
    FROM unique_avg
    WHERE score > 0
  `).all() as {model: string, graph_index: number, score: number}[];

  let sumEdgesMap: {[m: string]: number} = {};
  for (let r of scoreByModelTask) {
    if (EXCLUDED_SET.has(r.model)) continue;
    let ec = edgeCountByTask[r.graph_index] || 0;
    sumEdgesMap[r.model] = (sumEdgesMap[r.model] || 0) + ec * r.score;
  }

  let relDates: {[k: string]: string} = {};
  let relCsvLines = fs.readFileSync("figures/model-release-dates.csv", "utf8").trim().split("\n").slice(1);
  for (let line of relCsvLines) {
    let [name, , date] = line.split(",");
    relDates[name] = date;
  }

  let models: {name: string, sumEdges: number, date: number}[] = [];
  for (let m in sumEdgesMap) {
    if (!relDates[m] || EXCLUDED_SET.has(m)) continue;
    models.push({name: m, sumEdges: Math.round(sumEdgesMap[m]), date: +new Date(relDates[m] + "T00:00:00Z")});
  }

  let W5 = 820, H5 = 460;
  let m5 = {top: 40, right: 30, bottom: 55, left: 70};
  let pw5 = W5 - m5.left - m5.right;
  let ph5 = H5 - m5.top - m5.bottom;

  let maxY = 1300;
  let minDate = +new Date("2023-10-01T00:00:00Z");
  let maxDate = +new Date("2026-02-01T00:00:00Z");

  function toX(d: number) {
    return m5.left + ((d - minDate) / (maxDate - minDate)) * pw5;
  }
  function toY(e: number) {
    return m5.top + ph5 - (e / maxY) * ph5;
  }

  let labelSet = new Set([
    "mixtral-8x7b", "gpt-4o", "o1-mini", "o1",
    "sonnet-3-7-0219-32k", "deepseek-r1",
    "opus-4-5-32k-stream", "gemini3-pro-preview",
    "gpt-5-codex-high", "sonnet-4-5-32k-stream",
    "gpt-5.2-pro-medium", "gpt-5.2-low", "glm-4.7", "o3",
    "phi-4", "olmo-2", "haiku-4-5-32k-stream",
    "o4-mini",
  ]);

  let nudge: {[k: string]: [number, number]} = {
    "gpt-5.2-pro-medium": [5, -8],
    "gpt-5.2-low": [5, 12],
    "glm-4.7": [5, 12],
    "o3": [5, -8],
    "mixtral-8x7b": [5, -8],
    "gpt-4o": [5, -8],
    "o1-mini": [5, -8],
    "o1": [5, -8],
    "sonnet-3-7-0219-32k": [5, -8],
    "deepseek-r1": [5, -8],
    "opus-4-5-32k-stream": [5, -8],
    "gemini3-pro-preview": [5, 12],
    "gpt-5-codex-high": [5, -8],
    "sonnet-4-5-32k-stream": [5, 12],
    "phi-4": [5, -8],
    "olmo-2": [5, 12],
    "haiku-4-5-32k-stream": [-5, 12],
    "o4-mini": [5, 12],
  };

  let points = models.map(m => {
    let x = toX(m.date);
    let y = toY(m.sumEdges);
    let showLabel = labelSet.has(m.name);
    let [dx, dy] = nudge[m.name] || [5, -5];
    let label = showLabel
      ? `\n  <text x="${x + dx}" y="${y + dy}" font-size="8" fill="#555">${m.name.replace(/-stream$/, "").replace(/-2025-08-07/, "")}</text>`
      : "";
    let color = m.sumEdges >= 400 ? "#4e79a7" : m.sumEdges >= 100 ? "#f28e2b" : "#e15759";
    return `  <circle cx="${x}" cy="${y}" r="${showLabel ? 4 : 3}" fill="${color}" opacity="0.7"/>${label}`;
  }).join("\n");

  let yTicks = [0, 200, 400, 600, 800, 1000, 1200];
  let yGrid = yTicks.map(t => {
    let y = toY(t);
    return `  <line x1="${m5.left}" y1="${y}" x2="${W5 - m5.right}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5"/>
  <text x="${m5.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666">${t}</text>`;
  }).join("\n");

  let xTicks = ["2024-01", "2024-04", "2024-07", "2024-10", "2025-01", "2025-04", "2025-07", "2025-10", "2026-01"];
  let xGrid = xTicks.map(t => {
    let x = toX(+new Date(t + "-01T00:00:00Z"));
    let label = t.replace(/^20/, "'");
    return `  <line x1="${x}" y1="${m5.top}" x2="${x}" y2="${m5.top + ph5}" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="${x}" y="${m5.top + ph5 + 16}" text-anchor="middle" font-size="11" fill="#666">${label}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W5} ${H5}" font-family="system-ui, sans-serif">
  <rect width="${W5}" height="${H5}" fill="white"/>
  <text x="${W5 / 2}" y="24" text-anchor="middle" font-size="15" font-weight="600" fill="#222">Total Edges in Solved Tasks vs Model Release Date</text>
  <text x="${W5 / 2}" y="${H5 - 8}" text-anchor="middle" font-size="12" fill="#666">Release date (approximate)</text>
  <text x="16" y="${H5 / 2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90 16 ${H5 / 2})">Sum of edges across solved tasks</text>
${yGrid}
${xGrid}
  <line x1="${m5.left}" y1="${m5.top}" x2="${m5.left}" y2="${m5.top + ph5}" stroke="#333" stroke-width="1"/>
  <line x1="${m5.left}" y1="${m5.top + ph5}" x2="${W5 - m5.right}" y2="${m5.top + ph5}" stroke="#333" stroke-width="1"/>
${points}
</svg>`;
}

fs.writeFileSync("figures/solve-rate-by-edges-bar.svg", chart1());
fs.writeFileSync("figures/solve-rate-vs-edges-scatter.svg", chart2());
fs.writeFileSync("figures/solved-vs-time-scatter.svg", chart3());
fs.writeFileSync("figures/solved-vs-release-date-scatter.svg", chart4());
fs.writeFileSync("figures/sum-edges-vs-release-date-scatter.svg", chart5());
console.log("Charts written to figures/");
