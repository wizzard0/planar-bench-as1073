import type {Graph} from "./tasks.ts";

export function allTaskNodes(graph: Graph): string[] {
  let nodes = new Set<string>();
  for (let n in graph) {
    nodes.add(n);
    for (let m of graph[n]) {
      nodes.add(m);
    }
  }
  return Array.from(nodes);
}

export function allTaskEdges(graph: Graph): [string, string][] {
  let preSort: string[] = [];
  for (let n in graph) {
    for (let m of graph[n]) {
      // flip if necessary
      if (n < m) {
        preSort.push(n + "-" + m);
      } else {
        preSort.push(m + "-" + n);
      }
    }
  }
  preSort.sort();
  let edges = new Array<[string, string]>();
  for (let e of preSort) {
    edges.push(e.split('-') as [string, string]);
  }
  return edges;
}