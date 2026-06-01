// Example usage
import {adjToEdgeMap, adjToGraph6, graph6ToAdj} from "./claude-parser.ts";

function main(): void {
  const testMatrix: number[][] = [
    [0, 0, 1, 0, 1],
    [0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 0, 0, 1],
    [1, 0, 0, 1, 0],
  ];

  console.log(adjToGraph6(testMatrix));

  const [vertices, matrix] = graph6ToAdj("DQc");
  console.log(vertices);
  matrix.forEach(row => console.log(row));
  console.log(adjToEdgeMap(matrix));
}

function check2() {
  let a = `CF
CN
CR
C^
Cr
C~
`;
  let graphs = a.trim().split('\n');
  for (let g of graphs) {
    let [vertices, matrix] = graph6ToAdj(g);
    matrix.forEach(row => console.log(row));
    console.log(g, adjToEdgeMap(matrix));
  }
}