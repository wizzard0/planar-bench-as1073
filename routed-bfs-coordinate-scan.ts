import { Database } from "bun:sqlite";
import { findGraph, loadEdgeMap } from "./graphs/load-edge-map.ts";
import { allTaskEdges, allTaskNodes } from "./validation/task-nodes.ts";
import type { Graph } from "./validation/tasks.ts";

type Pt = { x: number; y: number };
type Edge = [string, string];

type ParsedRow = {
  id: number;
  model: string;
  graph_index: number;
  matrix_dump: string | null;
  error_msg: string | null;
  is_valid: number;
};

type GraphInfo = {
  g6: string;
  map: Graph;
  nodes: string[];
  edges: Edge[];
  required: Set<string>;
};

type StraightResult = {
  pass: boolean;
  reason: string;
  coords?: Record<string, Pt>;
};

type RoutedResult = {
  closes: boolean;
  reason: string;
  skipped: boolean;
  coords?: Record<string, Pt>;
  edges: string[];
  adjacentNodeEdges: string[];
  straightDrawnEdges: string[];
  componentEdges: string[];
  possibleEdges: string[];
  matrixPainted: string;
  paintLegend: string[];
  missing: string[];
  extra: string[];
  ambiguousComponents: number;
};

type ScanHit = {
  row: ParsedRow;
  graph: GraphInfo;
  straight: StraightResult;
  routed: RoutedResult;
};

type TableInfoRow = {
  name: string;
};

type PendingUpdate = {
  id: number;
  isValidCoords: number;
  isValidBfs: number;
};

const dbPath = process.argv[2] ?? "out/results.sqlite";
const sampleLimit = Number(process.env.SAMPLE_LIMIT ?? "6");
const maxRows = process.env.MAX_ROWS ? Number(process.env.MAX_ROWS) : Infinity;
const randomizeRows = process.env.RANDOMIZE_ROWS === "1";
const printCategoryExamples = process.env.PRINT_CATEGORY_EXAMPLES === "1";
const updateGraphRuns = process.env.UPDATE_GRAPH_RUNS === "1";

if (updateGraphRuns && (randomizeRows || maxRows !== Infinity)) {
  throw new Error("UPDATE_GRAPH_RUNS requires a full deterministic scan; unset RANDOMIZE_ROWS and MAX_ROWS");
}

const graphCache = new Map<number, Promise<GraphInfo>>();
const connectorChars = new Set([
  "-",
  "_",
  "|",
  "/",
  "\\",
  "─",
  "│",
  "+",
  ".",
  ",",
  "'",
  "`",
  "´",
]);
const wrapperChars = new Set(["(", ")", "[", "]", "{", "}", "<", ">"]);

function edgeKey(a: string, b: string) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function parseKey(edge: string): Edge {
  return edge.split("-") as Edge;
}

async function graphInfo(index: number): Promise<GraphInfo> {
  let cached = graphCache.get(index);
  if (!cached) {
    cached = (async () => {
      const graphRef = findGraph(index);
      const loaded = await loadEdgeMap(graphRef.numVerticesGroup, graphRef.groupIndex);
      const nodes = allTaskNodes(loaded.map).sort();
      const edges = allTaskEdges(loaded.map);
      return {
        g6: loaded.g6,
        map: loaded.map,
        nodes,
        edges,
        required: new Set(edges.map(([a, b]) => edgeKey(a, b))),
      };
    })();
    graphCache.set(index, cached);
  }
  return cached;
}

function matrixLines(matrix: string | null) {
  if (!matrix) return [];
  return matrix.replace(/\r/g, "").split("\n");
}

function widthOf(lines: string[]) {
  return Math.max(0, ...lines.map((line) => [...line].length));
}

function charAt(lines: string[], x: number, y: number) {
  if (y < 0 || y >= lines.length) return " ";
  const chars = [...lines[y]];
  return chars[x] ?? " ";
}

function gridFrom(lines: string[]) {
  const width = widthOf(lines);
  return lines.map((line) => {
    const chars = [...line];
    while (chars.length < width) chars.push(" ");
    return chars;
  });
}

function parseNodeCoords(lines: string[], nodes: string[]) {
  const found = new Map<string, Pt[]>();
  for (const node of nodes) found.set(node, []);
  for (let y = 0; y < lines.length; y++) {
    const chars = [...lines[y]];
    for (let x = 0; x < chars.length; x++) {
      const matches = found.get(chars[x]);
      if (matches) matches.push({ x, y });
    }
  }

  const bad = nodes.filter((node) => (found.get(node)?.length ?? 0) !== 1);
  if (bad.length) {
    return {
      ok: false as const,
      reason: `missing/duplicate expected nodes: ${bad.join(", ")}`,
    };
  }

  const coords: Record<string, Pt> = {};
  for (const node of nodes) coords[node] = found.get(node)![0];
  return { ok: true as const, coords };
}

function allRenderedNodeTokens(lines: string[]) {
  const nodes: string[] = [];
  for (const line of lines) {
    const matches = line.match(/[A-Za-z0-9]+/g);
    if (matches) nodes.push(...matches);
  }
  return nodes;
}

function orient(a: Pt, b: Pt, c: Pt) {
  const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.sign(value);
}

function between(a: number, b: number, c: number) {
  return Math.min(a, b) <= c && c <= Math.max(a, b);
}

function onSegment(a: Pt, b: Pt, p: Pt) {
  return orient(a, b, p) === 0 && between(a.x, b.x, p.x) && between(a.y, b.y, p.y);
}

function segmentsIntersect(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) return o1 !== o2 && o3 !== o4;
  return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}

function straightCoordinateCheck(lines: string[], graph: GraphInfo): StraightResult {
  const renderedNodes = allRenderedNodeTokens(lines);
  const extraNodes = renderedNodes.filter((node) => !graph.nodes.includes(node));
  if (extraNodes.length > 0) {
    return { pass: false, reason: `extra nodes: ${extraNodes.join(", ")}` };
  }

  const parsed = parseNodeCoords(lines, graph.nodes);
  if (!parsed.ok) return { pass: false, reason: parsed.reason };
  const coords = parsed.coords;
  const adjacentEdges = parseAdjacentNodeEdges(graph, coords);
  const straightEdges = parseStraightDrawnEdges(lines, graph, coords).edges;
  const definiteExtraEdges = [...new Set([...adjacentEdges, ...straightEdges])]
    .filter((edge) => !graph.required.has(edge))
    .sort();
  if (definiteExtraEdges.length > 0) {
    return { pass: false, reason: `extra edges: ${definiteExtraEdges.join(", ")}`, coords };
  }

  for (const [a, b] of graph.edges) {
    for (const node of graph.nodes) {
      if (node === a || node === b) continue;
      if (onSegment(coords[a], coords[b], coords[node])) {
        return { pass: false, reason: `edge ${a}-${b} passes through node ${node}`, coords };
      }
    }
  }

  for (let i = 0; i < graph.edges.length; i++) {
    const [a, b] = graph.edges[i];
    for (let j = i + 1; j < graph.edges.length; j++) {
      const [c, d] = graph.edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsIntersect(coords[a], coords[b], coords[c], coords[d])) {
        return { pass: false, reason: `intersection ${a}-${b} with ${c}-${d}`, coords };
      }
    }
  }

  return { pass: true, reason: "ok", coords };
}

function allNodePairs(nodes: string[], coords: Record<string, Pt>) {
  const pairs: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) pairs.push([nodes[i], nodes[j]]);
  }
  pairs.sort((a, b) => {
    const da = Math.abs(coords[a[0]].x - coords[a[1]].x) + Math.abs(coords[a[0]].y - coords[a[1]].y);
    const db = Math.abs(coords[b[0]].x - coords[b[1]].x) + Math.abs(coords[b[0]].y - coords[b[1]].y);
    return da - db || edgeKey(a[0], a[1]).localeCompare(edgeKey(b[0], b[1]));
  });
  return pairs;
}

function checkHorizontal(grid: string[][], coords: Record<string, Pt>, a: string, b: string) {
  const pa = coords[a];
  const pb = coords[b];
  if (pa.y !== pb.y) return null;
  const y = pa.y;
  const xMin = Math.min(pa.x, pb.x);
  const xMax = Math.max(pa.x, pb.x);
  let found = false;
  const cells: Pt[] = [];
  for (let x = xMin + 1; x < xMax; x++) {
    const ch = grid[y]?.[x] ?? " ";
    if (!"-_─ ".includes(ch)) return null;
    if ("-_─".includes(ch)) {
      found = true;
      cells.push({ x, y });
    }
  }
  return found ? cells : null;
}

function checkVertical(grid: string[][], coords: Record<string, Pt>, a: string, b: string) {
  const pa = coords[a];
  const pb = coords[b];
  if (pa.x !== pb.x) return null;
  const x = pa.x;
  const yMin = Math.min(pa.y, pb.y);
  const yMax = Math.max(pa.y, pb.y);
  const cells: Pt[] = [];
  for (let y = yMin + 1; y < yMax; y++) {
    const ch = grid[y]?.[x] ?? " ";
    if (!"|│".includes(ch)) return null;
    cells.push({ x, y });
  }
  return cells.length ? cells : null;
}

function checkDiagonalBox(grid: string[][], coords: Record<string, Pt>, a: string, b: string) {
  const pa = coords[a];
  const pb = coords[b];
  if (pa.x === pb.x || pa.y === pb.y) return null;
  const xMin = Math.min(pa.x, pb.x);
  const xMax = Math.max(pa.x, pb.x);
  const yMin = Math.min(pa.y, pb.y);
  const yMax = Math.max(pa.y, pb.y);
  const down = (pa.x === xMin && pa.y === yMin) || (pa.x === xMax && pa.y === yMax);
  const glyph = down ? "\\" : "/";
  const cells: Pt[] = [];

  for (let y = yMin + 1; y < yMax; y++) {
    let hitX = -1;
    for (let x = xMin + 1; x < xMax; x++) {
      const ch = grid[y]?.[x] ?? " ";
      if (ch === glyph) {
        if (hitX !== -1) return null;
        hitX = x;
      } else if (ch !== " ") {
        return null;
      }
    }
    if (hitX === -1) return null;
    cells.push({ x: hitX, y });
  }

  return cells.length ? cells : null;
}

function parseStraightDrawnEdges(lines: string[], graph: GraphInfo, coords: Record<string, Pt>) {
  const grid = gridFrom(lines);
  const consumed = new Set<string>();
  const edges = new Set<string>();
  const edgeCells = new Map<string, Pt[]>();
  const pairs = allNodePairs(graph.nodes, coords);

  for (const [a, b] of pairs) {
    const cells =
      checkHorizontal(grid, coords, a, b) ??
      checkVertical(grid, coords, a, b) ??
      checkDiagonalBox(grid, coords, a, b);
    if (!cells) continue;
    const key = edgeKey(a, b);
    edges.add(key);
    edgeCells.set(key, cells);
    for (const { x, y } of cells) {
      consumed.add(`${x},${y}`);
      if (grid[y]) grid[y][x] = "#";
    }
  }

  return { edges, consumed, grid, edgeCells };
}

function parseAdjacentNodeEdges(graph: GraphInfo, coords: Record<string, Pt>) {
  const edges = new Set<string>();
  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const a = graph.nodes[i];
      const b = graph.nodes[j];
      const dx = Math.abs(coords[a].x - coords[b].x);
      const dy = Math.abs(coords[a].y - coords[b].y);
      if ((dx !== 0 || dy !== 0) && dx <= 1 && dy <= 1) {
        edges.add(edgeKey(a, b));
      }
    }
  }
  return edges;
}

function isConnector(ch: string) {
  return connectorChars.has(ch);
}

function neighbors8(p: Pt) {
  const out: Pt[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      out.push({ x: p.x + dx, y: p.y + dy });
    }
  }
  return out;
}

function cellKey(p: Pt) {
  return `${p.x},${p.y}`;
}

function makeNodeHalos(lines: string[], nodes: string[], coords: Record<string, Pt>) {
  const halos = new Map<string, Pt[]>();
  for (const node of nodes) {
    const p = coords[node];
    const halo = [p];
    for (const dx of [-1, 1]) {
      const q = { x: p.x + dx, y: p.y };
      if (wrapperChars.has(charAt(lines, q.x, q.y))) halo.push(q);
    }
    halos.set(node, halo);
  }
  return halos;
}

function attachmentDistance(ch: string, connector: Pt, halo: Pt) {
  const dx = Math.abs(connector.x - halo.x);
  const dy = Math.abs(connector.y - halo.y);
  if (dx <= 1 && dy <= 1) return true;
  if ("-_─".includes(ch) && dx <= 2 && dy <= 1) return true;
  if ("|│".includes(ch) && dx <= 1 && dy <= 2) return true;
  if ("/\\".includes(ch) && dx <= 2 && dy <= 2) return true;
  return false;
}

function attachedNodesForCell(lines: string[], graph: GraphInfo, halos: Map<string, Pt[]>, cell: Pt) {
  const ch = charAt(lines, cell.x, cell.y);
  const attached: string[] = [];
  for (const node of graph.nodes) {
    for (const halo of halos.get(node) ?? []) {
      if (attachmentDistance(ch, cell, halo)) {
        attached.push(node);
        break;
      }
    }
  }
  return attached;
}

function shortestPathInsideComponent(
  component: Pt[],
  starts: Pt[],
  targets: Pt[],
  occupied = new Set<string>(),
) {
  const componentSet = new Set(component.map(cellKey));
  const targetSet = new Set(targets.map(cellKey));
  const queue: Pt[] = [];
  const dist = new Map<string, number>();
  const parent = new Map<string, string>();

  for (const start of starts) {
    const key = cellKey(start);
    if (occupied.has(key)) continue;
    if (!componentSet.has(key)) continue;
    queue.push(start);
    dist.set(key, 0);
  }

  for (let qi = 0; qi < queue.length; qi++) {
    const p = queue[qi];
    const key = cellKey(p);
    if (targetSet.has(key)) {
      const path: Pt[] = [];
      let current = key;
      while (true) {
        const [x, y] = current.split(",").map(Number);
        path.push({ x, y });
        const prev = parent.get(current);
        if (!prev) break;
        current = prev;
      }
      path.reverse();
      return path;
    }

    for (const n of neighbors8(p)) {
      const nk = cellKey(n);
      if (!componentSet.has(nk) || dist.has(nk)) continue;
      if (occupied.has(nk)) continue;
      dist.set(nk, dist.get(key)! + 1);
      parent.set(nk, key);
      queue.push(n);
    }
  }

  return null;
}

function pathKeepsRemainingConnected(
  component: Pt[],
  attached: Map<string, Pt[]>,
  occupied: Set<string>,
  path: Pt[],
  remainingEdges: string[],
) {
  const nextOccupied = new Set(occupied);
  for (const cell of path) nextOccupied.add(cellKey(cell));
  return remainingEdges.every((edge) => {
    const [a, b] = parseKey(edge);
    return !!shortestPathInsideComponent(
      component,
      attached.get(a) ?? [],
      attached.get(b) ?? [],
      nextOccupied,
    );
  });
}

function pathHitsOtherAttachedNode(
  path: Pt[],
  attached: Map<string, Pt[]>,
  a: string,
  b: string,
) {
  const pathSet = new Set(path.map(cellKey));
  for (const [node, cells] of attached) {
    if (node === a || node === b) continue;
    if (cells.some((cell) => pathSet.has(cellKey(cell)))) return true;
  }
  return false;
}

function packRequiredEdgesInComponent(
  component: Pt[],
  attached: Map<string, Pt[]>,
  neededEdges: string[],
) {
  const packed = new Map<string, Pt[]>();
  const occupied = new Set<string>();
  const remaining = new Set(neededEdges);

  while (remaining.size > 0) {
    const candidates: { edge: string; path: Pt[]; preserves: boolean }[] = [];
    for (const edge of [...remaining].sort()) {
      const [a, b] = parseKey(edge);
      const path = shortestPathInsideComponent(
        component,
        attached.get(a) ?? [],
        attached.get(b) ?? [],
        occupied,
      );
      if (!path) continue;
      if (pathHitsOtherAttachedNode(path, attached, a, b)) continue;
      const otherEdges = [...remaining].filter((other) => other !== edge);
      candidates.push({
        edge,
        path,
        preserves: pathKeepsRemainingConnected(component, attached, occupied, path, otherEdges),
      });
    }

    if (candidates.length === 0) break;
    candidates.sort((a, b) => {
      if (a.preserves !== b.preserves) return a.preserves ? -1 : 1;
      return a.path.length - b.path.length || a.edge.localeCompare(b.edge);
    });

    const chosen = candidates[0];
    packed.set(chosen.edge, chosen.path);
    remaining.delete(chosen.edge);
    for (const cell of chosen.path) occupied.add(cellKey(cell));
  }

  return packed;
}

function paintLabel(index: number) {
  const labels = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return labels[index] ?? "*";
}

function paintEdges(lines: string[], edgeCells: Map<string, Pt[]>) {
  const grid = gridFrom(lines);
  const legend: string[] = [];
  const entries = [...edgeCells.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (let index = 0; index < entries.length; index++) {
    const [edge, cells] = entries[index];
    const label = paintLabel(index);
    legend.push(`${label}=${edge}`);
    for (const { x, y } of cells) {
      if (grid[y]?.[x] !== undefined) grid[y][x] = label;
    }
  }
  return {
    matrixPainted: grid.map((line) => line.join("").replace(/\s+$/g, "")).join("\n"),
    paintLegend: legend,
  };
}

function routedBfsParser(lines: string[], graph: GraphInfo): RoutedResult {
  const renderedNodes = allRenderedNodeTokens(lines);
  const extraNodes = renderedNodes.filter((node) => !graph.nodes.includes(node));
  if (extraNodes.length > 0) {
    return {
      closes: false,
      reason: `extra nodes: ${extraNodes.join(", ")}`,
      skipped: false,
      edges: [],
      adjacentNodeEdges: [],
      straightDrawnEdges: [],
      componentEdges: [],
      possibleEdges: [],
      matrixPainted: lines.join("\n"),
      paintLegend: [],
      missing: [...graph.required],
      extra: [],
      ambiguousComponents: 0,
    };
  }

  const parsed = parseNodeCoords(lines, graph.nodes);
  if (!parsed.ok) {
    return {
      closes: false,
      reason: parsed.reason,
      skipped: false,
      edges: [],
      adjacentNodeEdges: [],
      straightDrawnEdges: [],
      componentEdges: [],
      possibleEdges: [],
      matrixPainted: lines.join("\n"),
      paintLegend: [],
      missing: [...graph.required],
      extra: [],
      ambiguousComponents: 0,
    };
  }

  const coords = parsed.coords;
  const adjacentEdges = parseAdjacentNodeEdges(graph, coords);
  const straight = parseStraightDrawnEdges(lines, graph, coords);
  const definiteEdges = new Set([...adjacentEdges, ...straight.edges]);
  const definiteExtra = [...definiteEdges].filter((edge) => !graph.required.has(edge)).sort();
  if (definiteExtra.length > 0) {
    const { matrixPainted, paintLegend } = paintEdges(lines, straight.edgeCells);
    return {
      closes: false,
      reason: `skipped: definite extra edges: ${definiteExtra.join(", ")}`,
      skipped: true,
      coords,
      edges: [...definiteEdges].sort(),
      adjacentNodeEdges: [...adjacentEdges].sort(),
      straightDrawnEdges: [...straight.edges].sort(),
      componentEdges: [],
      possibleEdges: [],
      matrixPainted,
      paintLegend,
      missing: [...graph.required].filter((edge) => !definiteEdges.has(edge)),
      extra: definiteExtra,
      ambiguousComponents: 0,
    };
  }

  const grid = straight.grid;
  const width = grid[0]?.length ?? 0;
  const height = grid.length;
  const visited = new Set<string>();
  const halos = makeNodeHalos(lines, graph.nodes, coords);
  const componentEdges = new Set<string>();
  const componentEdgeCells = new Map<string, Pt[]>();
  const possibleEdges = new Set<string>();
  let ambiguousComponents = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = { x, y };
      const startKey = cellKey(start);
      if (visited.has(startKey) || !isConnector(grid[y][x])) continue;

      const queue = [start];
      const component: Pt[] = [];
      visited.add(startKey);

      for (let qi = 0; qi < queue.length; qi++) {
        const p = queue[qi];
        component.push(p);
        for (const n of neighbors8(p)) {
          if (n.x < 0 || n.y < 0 || n.x >= width || n.y >= height) continue;
          const nk = cellKey(n);
          if (visited.has(nk) || !isConnector(grid[n.y][n.x])) continue;
          visited.add(nk);
          queue.push(n);
        }
      }

      const attached = new Map<string, Pt[]>();
      for (const cell of component) {
        for (const node of attachedNodesForCell(lines, graph, halos, cell)) {
          const cells = attached.get(node) ?? [];
          cells.push(cell);
          attached.set(node, cells);
        }
      }

      const touched = [...attached.keys()].sort();
      if (touched.length === 2) {
        const edge = edgeKey(touched[0], touched[1]);
        componentEdges.add(edge);
        componentEdgeCells.set(edge, component);
        continue;
      }
      if (touched.length < 2) continue;

      ambiguousComponents++;
      const neededEdges = graph.edges
        .map(([a, b]) => edgeKey(a, b))
        .filter((edge) => {
          if (definiteEdges.has(edge)) return false;
          const [a, b] = parseKey(edge);
          return touched.includes(a) && touched.includes(b);
        });
      for (let i = 0; i < touched.length; i++) {
        for (let j = i + 1; j < touched.length; j++) {
          const a = touched[i];
          const b = touched[j];
          const path = shortestPathInsideComponent(component, attached.get(a) ?? [], attached.get(b) ?? []);
          if (!path) continue;
          const pathSet = new Set(path.map(cellKey));
          let hitsThird = false;
          for (const node of touched) {
            if (node === a || node === b) continue;
            const cells = attached.get(node) ?? [];
            if (cells.some((cell) => pathSet.has(cellKey(cell)))) {
              hitsThird = true;
              break;
            }
          }
          if (!hitsThird) possibleEdges.add(edgeKey(a, b));
        }
      }
      for (const [edge, path] of packRequiredEdgesInComponent(component, attached, neededEdges)) {
        componentEdges.add(edge);
        componentEdgeCells.set(edge, path);
      }
    }
  }

  const routedEdges = new Set([...definiteEdges, ...componentEdges]);
  const edgeCells = new Map<string, Pt[]>([
    ...straight.edgeCells,
    ...componentEdgeCells,
  ]);
  const { matrixPainted, paintLegend } = paintEdges(lines, edgeCells);
  const missing = [...graph.required].filter((edge) => !routedEdges.has(edge));
  const extra = [...routedEdges].filter((edge) => !graph.required.has(edge)).sort();

  return {
    closes: missing.length === 0 && extra.length === 0,
    reason:
      missing.length === 0 && extra.length === 0
        ? "ok"
        : [
            missing.length > 0 ? `missing: ${missing.join(", ")}` : "",
            extra.length > 0 ? `extra: ${extra.join(", ")}` : "",
          ].filter(Boolean).join("; "),
    skipped: false,
    coords,
    edges: [...routedEdges].sort(),
    adjacentNodeEdges: [...adjacentEdges].sort(),
    straightDrawnEdges: [...straight.edges].sort(),
    componentEdges: [...componentEdges].sort(),
    possibleEdges: [...possibleEdges].sort(),
    matrixPainted,
    paintLegend,
    missing,
    extra,
    ambiguousComponents,
  };
}

function printHit(title: string, hit: ScanHit) {
  const row = hit.row;
  console.log(`\n## ${title}`);
  console.log(`id=${row.id} task=${row.graph_index} g6=${hit.graph.g6} model=${row.model}`);
  console.log(`existing_verifier=${row.is_valid} old_error=${row.error_msg ?? ""}`);
  console.log(`straightPass=${hit.straight.pass} straightReason=${hit.straight.reason}`);
  console.log(`bfsCloses=${hit.routed.closes} bfsReason=${hit.routed.reason}`);
  console.log(`required=${[...hit.graph.required].sort().join(", ")}`);
  console.log(`bfsEdges=${hit.routed.edges.join(", ")}`);
  console.log(`adjacentNodeEdges=${hit.routed.adjacentNodeEdges.join(", ")}`);
  console.log(`straightDrawnEdges=${hit.routed.straightDrawnEdges.join(", ")}`);
  console.log(`componentEdges=${hit.routed.componentEdges.join(", ")}`);
  console.log(`possibleEdges=${hit.routed.possibleEdges.join(", ")}`);
  console.log(`extra=${hit.routed.extra.join(", ") || "(none)"}`);
  if (hit.routed.paintLegend.length > 0) {
    console.log(`paintLegend=${hit.routed.paintLegend.join(", ")}`);
    console.log("matrixPainted:");
    console.log(hit.routed.matrixPainted);
  }
  console.log("matrix:");
  console.log(row.matrix_dump ?? "");
}

function ensureGraphRunVerifierColumns(db: Database) {
  const columns = new Set(
    (db.query("PRAGMA table_info(graph_runs)").all() as TableInfoRow[]).map((row) => row.name),
  );
  if (!columns.has("is_valid_coords")) {
    db.run("ALTER TABLE graph_runs ADD COLUMN is_valid_coords INTEGER NOT NULL DEFAULT 0");
  }
  if (!columns.has("is_valid_bfs")) {
    db.run("ALTER TABLE graph_runs ADD COLUMN is_valid_bfs INTEGER NOT NULL DEFAULT 0");
  }
}

console.error(`PID ${process.pid}`);

const db = updateGraphRuns ? new Database(dbPath) : new Database(dbPath, { readonly: true });
if (updateGraphRuns) ensureGraphRunVerifierColumns(db);
const rows = db
  .query(
    `select id, model, graph_index, matrix_dump, error_msg, is_valid from graph_runs order by ${randomizeRows ? "random()" : "id"}`,
  )
  .all() as ParsedRow[];

let scanned = 0;
let existingPass = 0;
let straightPass = 0;
let bfsCloses = 0;
let bfsClosesStraightFails = 0;
let bfsClosesExistingFails = 0;
const comboCounts = new Map<string, number>();
const categoryExamples = new Map<string, ScanHit[]>();
const categoryExampleNodeCounts = new Map<string, Set<number>>();
const sampleBfs: ScanHit[] = [];
const sampleBfsStraightFails: ScanHit[] = [];
const sampleBfsExistingFails: ScanHit[] = [];
const byTask = new Map<number, { rows: number; straight: number; bfs: number; bfsNotStraight: number }>();
const pendingUpdates: PendingUpdate[] = [];

for (const row of rows) {
  if (scanned >= maxRows) break;
  scanned++;
  if (row.is_valid) existingPass++;
  const graph = await graphInfo(row.graph_index);
  const lines = matrixLines(row.matrix_dump);
  const isAcceptedTodoRow = !!row.is_valid && row.matrix_dump?.trim() === "todo";
  const straight: StraightResult = isAcceptedTodoRow
    ? { pass: true, reason: "todo row" }
    : straightCoordinateCheck(lines, graph);
  const routed: RoutedResult = isAcceptedTodoRow
    ? {
        closes: true,
        reason: "todo row",
        skipped: false,
        edges: [...graph.required].sort(),
        adjacentNodeEdges: [],
        straightDrawnEdges: [],
        componentEdges: [],
        possibleEdges: [],
        matrixPainted: row.matrix_dump ?? "",
        paintLegend: [],
        missing: [],
        extra: [],
        ambiguousComponents: 0,
      }
    : routedBfsParser(lines, graph);
  if (updateGraphRuns) {
    pendingUpdates.push({
      id: row.id,
      isValidCoords: straight.pass ? 1 : 0,
      isValidBfs: routed.closes ? 1 : 0,
    });
  }
  const comboKey = `${row.is_valid ? 1 : 0}${straight.pass ? 1 : 0}${routed.closes ? 1 : 0}`;
  comboCounts.set(comboKey, (comboCounts.get(comboKey) ?? 0) + 1);
  if (printCategoryExamples && ["001", "010", "011"].includes(comboKey)) {
    const examples = categoryExamples.get(comboKey) ?? [];
    const nodeCounts = categoryExampleNodeCounts.get(comboKey) ?? new Set<number>();
    if (examples.length < 3 && !nodeCounts.has(graph.nodes.length)) {
      examples.push({ row, graph, straight, routed });
      nodeCounts.add(graph.nodes.length);
      categoryExamples.set(comboKey, examples);
      categoryExampleNodeCounts.set(comboKey, nodeCounts);
    }
  }
  const bucket = byTask.get(row.graph_index) ?? { rows: 0, straight: 0, bfs: 0, bfsNotStraight: 0 };
  bucket.rows++;

  if (straight.pass) {
    straightPass++;
    bucket.straight++;
  }
  if (routed.closes) {
    bfsCloses++;
    bucket.bfs++;
    const hit = { row, graph, straight, routed };
    if (sampleBfs.length < sampleLimit) sampleBfs.push(hit);
    if (!row.is_valid) {
      bfsClosesExistingFails++;
      if (sampleBfsExistingFails.length < sampleLimit) sampleBfsExistingFails.push(hit);
    }
    if (!straight.pass) {
      bfsClosesStraightFails++;
      bucket.bfsNotStraight++;
      if (sampleBfsStraightFails.length < sampleLimit) sampleBfsStraightFails.push(hit);
    }
  }
  byTask.set(row.graph_index, bucket);
}

if (updateGraphRuns) {
  const updateRow = db.query(
    "UPDATE graph_runs SET is_valid_coords = ?, is_valid_bfs = ? WHERE id = ?",
  );
  const writeUpdates = db.transaction((updates: PendingUpdate[]) => {
    for (const update of updates) {
      updateRow.run(update.isValidCoords, update.isValidBfs, update.id);
    }
  });
  writeUpdates(pendingUpdates);
}

const interestingTasks = [...byTask.entries()]
  .filter(([, value]) => value.bfs > 0 || value.straight > 0)
  .sort((a, b) => b[1].bfsNotStraight - a[1].bfsNotStraight || b[1].bfs - a[1].bfs || a[0] - b[0])
  .slice(0, 20);

console.log(`# Routed BFS + straight-coordinate scan`);
console.log(`db=${dbPath}`);
console.log(`rows_scanned=${scanned}`);
console.log(`existing_verifier_pass=${existingPass}`);
console.log(`straight_coordinate_pass=${straightPass}`);
console.log(`bfs_closes_graph=${bfsCloses}`);
console.log(`bfs_closes_existing_verifier_fails=${bfsClosesExistingFails}`);
console.log(`bfs_closes_but_straight_coordinate_fails=${bfsClosesStraightFails}`);
if (updateGraphRuns) console.log(`updated_graph_runs=${pendingUpdates.length}`);
console.log(`\n# Category combinations`);
console.log(`columns=existing_verifier_pass straight_coordinate_pass bfs_closes_graph count`);
for (const existing of [0, 1]) {
  for (const straight of [0, 1]) {
    for (const bfs of [0, 1]) {
      const key = `${existing}${straight}${bfs}`;
      console.log(`${existing} ${straight} ${bfs} ${comboCounts.get(key) ?? 0}`);
    }
  }
}
console.log(`\n# Interesting tasks`);
for (const [task, value] of interestingTasks) {
  const graph = await graphInfo(task);
  console.log(
    `task=${task} g6=${graph.g6} rows=${value.rows} straight=${value.straight} bfs=${value.bfs} bfs_not_straight=${value.bfsNotStraight}`,
  );
}

for (const hit of sampleBfs) printHit("BFS closes graph sample", hit);
for (const hit of sampleBfsStraightFails) printHit("BFS closes but straight-coordinate fails sample", hit);
for (const hit of sampleBfsExistingFails) printHit("BFS closes but existing verifier fails sample", hit);
if (printCategoryExamples) {
  const labels: Record<string, string> = {
    "001": "Category 001 only-bfs example",
    "010": "Category 010 only-coord example",
    "011": "Category 011 coord-and-bfs example",
  };
  for (const key of ["001", "010", "011"]) {
    for (const hit of categoryExamples.get(key) ?? []) printHit(labels[key], hit);
  }
}
