// Type for the return value of graph6ToAdj
export type Graph6Result = [number, number[][]];

export function graph6ToAdj(graph6: string): Graph6Result {
  // vertices + 63 = first char
  const vertices: number = graph6.charCodeAt(0) - 63;

  let binList: string = "";

  // Turn into 6 bit pieces
  for (let i = 1; i < graph6.length; i++) {
    binList += (graph6.charCodeAt(i) - 63).toString(2).padStart(6, '0');
  }

  const adjMatrix: number[][] = [];

  // Calculate number of elements in bottom left diagonal
  let numInBotLeftDiag: number = 0;
  for (let i = 0; i < vertices; i++) {
    numInBotLeftDiag += i;
  }

  // Build adjacency matrix
  for (let i = 0; i < vertices; i++) {
    const subAdjMatrix: number[] = new Array(vertices).fill(0);
    for (let j = 0; j < i; j++) {
      subAdjMatrix[j] = parseInt(binList[0], 10);
      binList = binList.slice(1);
    }
    adjMatrix.push(subAdjMatrix);
  }

  addTranspose(adjMatrix);

  return [vertices, adjMatrix];
}

function addTranspose(adjMatrix: number[][]): void {
  for (let j = 0; j < adjMatrix.length; j++) {
    for (let i = 0; i < j; i++) {
      adjMatrix[i][j] = adjMatrix[j][i];
    }
  }
}

export function adjToGraph6(adjMatrix: number[][]): string {
  let elementsFromRow = 0;
  let binList = "";

  // Take lower left diagonal matrix and append rows to string
  for (const row of adjMatrix) {
    elementsFromRow += 1;
    if (elementsFromRow === 1) { // Ignore first row
      continue;
    }
    const rowElements = row.slice(0, elementsFromRow - 1).map(String);
    binList += rowElements.join("");
  }

  // Pad on right with 0s until len is a multiple of 6
  if (binList.length % 6 !== 0) {
    binList += "0".repeat(6 - (binList.length % 6));
  }

  // Split into 6 bit pieces
  const chunks: string[] = [];
  for (let i = 0; i < binList.length; i += 6) {
    chunks.push(binList.slice(i, i + 6));
  }

  // vertices + 63 = first char
  let graph6 = String.fromCharCode(adjMatrix.length + 63);

  // Take chr of the int each piece and add to graph6
  for (const chunk of chunks) {
    graph6 += String.fromCharCode(parseInt(chunk, 2) + 63);
  }

  return graph6;
}

// Convert adjacency matrix to edge map using uppercase letters
export function adjToEdgeMap(adjMatrix: number[][]): { [key: string]: string[] } {
  const edgeMap: { [key: string]: string[] } = {};
  
  for (let i = 0; i < adjMatrix.length; i++) {
    const edges: string[] = [];
    for (let j = i; j < adjMatrix[i].length; j++) {
      if (adjMatrix[i][j] === 1) {
        edges.push(String.fromCharCode(65 + j)); // A=65, B=66, etc
      }
    }
    if (edges.length > 0) {
      edgeMap[String.fromCharCode(65 + i)] = edges;
    }
  }
  
  return edgeMap;
}

// Convert edge map to adjacency matrix using uppercase letters
export function edgeMapToAdj(edgeMap: { [key: string]: string[] }): number[][] {
  const nodes = new Set<string>();
  for (const [src, dsts] of Object.entries(edgeMap)) {
    nodes.add(src);
    dsts.forEach(dst => nodes.add(dst));
  }
  const size = Math.max(...Array.from(nodes).map(n => n.charCodeAt(0) - 65)) + 1;
  
  // empty matrix
  const adjMatrix: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
  
  for (const [src, dsts] of Object.entries(edgeMap)) {
    const srcIdx = src.charCodeAt(0) - 65;
    dsts.forEach(dst => {
      const dstIdx = dst.charCodeAt(0) - 65;
      adjMatrix[srcIdx][dstIdx] = 1;
    });
  }
  
  return adjMatrix;
}

