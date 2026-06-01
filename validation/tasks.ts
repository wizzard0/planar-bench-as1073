export function promptFromGraph(graph: Graph): string {
  return `this is a graph:
  ${formatGraph(graph)}
  
  draw an ascii art representation of it, enclosed in a code block. avoid intersections, this is a planar graph.`;
}

export let graph0line: Graph = {
  A: ['B'],
}
export let graph1tri: Graph = {
  A: ['B'],
  B: ['C'],
  C: ['A'],
}
export let graph2sq: Graph = {
  A: ['B'],
  B: ['C'],
  C: ['D'],
  D: ['A'],
}
export let penta:Graph = {
  // and an extra edge
  A:['B','C'],
  B:['C'],
  C:['D'],
  D:['E'],
  E:['A'],
}
export let pentaFlat:Graph = {
  // and an extra edge
  A:['B'],
  B:['C'],
  C:['D'],
  D:['E'],
  E:['A'],
}
export let septaFlat:Graph = {
  // and an extra edge
  A:['B','C'],
  B:['C'],
  C:['D'],
  D:['E'],
  E:['F'],
  F:['G'],
  G:['A'],
}
export let star3:Graph = {
  // and an extra edge
  A:['B','C','D','E'],
  F:['B','C','D','E'],
 // C:['H'],
}

export interface Graph {
  // node - other nodes
  [key: string]: string[];
}

export function formatGraph(graph: Graph): string {
  let edges = [];
  for (let n in graph) {
    for (let m of graph[n]) {
      edges.push([n, m]);
    }
  }
  return edges.map(e => `${e[0]} - ${e[1]}`).join(', ');
}