import type {Output} from "../scenarios/console-like.ts";

export function allSolutionNodes(lines: string[]): string[] {
  // consider all \b-separated substrings as node names
  let nodes = new Array<string>();
  let nodeRegex = /\b\w+\b/g;
  for (let line of lines) {
    let matches = line.match(nodeRegex);
    if (matches) {
      for (let m of matches) {
        nodes.push(m); // we want to detect duplicates
      }
    }
  }
  return Array.from(nodes);
}

const checkHorizontal = (nodeA: string, nodeB: string, nodeCoordinates: { [p: string]: [number, number] }, characterGrid: string[][], edgeNumber: number) => {
  // check for A+1 to B-1
  let [xA, yA] = nodeCoordinates[nodeA];
  let [xB, yB] = nodeCoordinates[nodeB];
  let xMin = Math.min(xA, xB);
  let xMax = Math.max(xA, xB);
  let foundMinus = false;
  // basically we parse '---' or ' -- ' etc
  for (let x = xMin + 1; x < xMax; x++) {
    let element = characterGrid[yA][x];
    if (!'─- '.includes(element)) {
      return false;
    }
    if ('─-'.includes(element)) {
      foundMinus = true;
    }
  }
  if (!foundMinus) {
    return false;
  }
  // fill the rectangle if edge is found
  for (let x = xMin + 1; x < xMax; x++) {
    characterGrid[yA][x] = edgeNumber.toString();
  }
  return true;
}

// │|

const checkVertical = (nodeA: string, nodeB: string, nodeCoordinates: {
  [p: string]: [number, number]
}, characterGrid: string[][], edgeNumber: number) => {
  let [xA, yA] = nodeCoordinates[nodeA];
  let [xB, yB] = nodeCoordinates[nodeB];
  let yMin = Math.min(yA, yB);
  let yMax = Math.max(yA, yB);
  for (let y = yMin + 1; y < yMax; y++) {
    if (!'│|'.includes(characterGrid[y][xA])) {
//        console.log({y,xA,element:characterGrid[y][xA]});
      return false;
    }
  }
//    console.log({detected:[nodeA,nodeB]});
  // fill the rectangle if edge is found
  for (let y = yMin + 1; y < yMax; y++) {
    characterGrid[y][xA] = edgeNumber.toString();
  }
  return true;
}

function checkRectangle(nodeA: string, nodeB: string, nodeCoordinates: {
  [p: string]: [number, number]
}, characterGrid: string[][], edgeNumber:number) {
  // option 1: horizontal edge
  if(nodeCoordinates[nodeA][1] === nodeCoordinates[nodeB][1]){
    throw new Error('checkRectangle should not be called for horizontal edges');
  }
  // option 2: vertical edge
  if(nodeCoordinates[nodeA][0] === nodeCoordinates[nodeB][0]){
    throw new Error('checkRectangle should not be called for vertical edges');
  }
  // option 3: diagonal \
  let [xA,yA] = nodeCoordinates[nodeA];
  let [xB,yB] = nodeCoordinates[nodeB];
  let xMin = Math.min(xA,xB);
  let xMax = Math.max(xA,xB);
  let yMin = Math.min(yA,yB);
  let yMax = Math.max(yA,yB);
  if((xA===xMin && yA===yMin) || (xA===xMax && yA===yMax)){
    // assume h (lines) < w because /\ characters are taller than wide
    let filled = new Array<[number,number]>(); // [x,y]
    for(let y=yMin+1;y<yMax;y++){
      let slice = characterGrid[y].slice(xMin+1,xMax).join('');
      let match:RegExpMatchArray|null = slice.match(/^( *)\\ *$/);
      if(!match){
        // let slice2 = characterGrid[y].slice(xMin,xMax+1).join('');
        // console.log(util.inspect({[slice2]:'no match',y,p:nodeA+nodeB},{breakLength:Infinity,colors:true}))
        return false;}
      filled.push([xMin + match[1].length+1,y]);
    }
    if(filled.length===0){
      return false;
    }
    for(let [x,y] of filled){
      characterGrid[y][x] = edgeNumber.toString();
    }
    return true;
  }
  // option 4: diagonal /
  if((xA===xMin && yA===yMax) || (xA===xMax && yA===yMin)){
    // assume h (lines) < w because /\ characters are taller than wide
    let filled = new Array<[number,number]>(); // [x,y]
    for(let y=yMin+1;y<yMax;y++){
      let slice = characterGrid[y].slice(xMin+1,xMax).join('');
      let match:RegExpMatchArray|null = slice.match(/^( *)\/ *$/);
      if(!match){
        // let slice2 = characterGrid[y].slice(xMin,xMax+1).join('');
        // console.log(util.inspect({[slice2]:'no match',y,p:nodeA+nodeB},{breakLength:Infinity,colors:true}))
        return false;}
      filled.push([xMin + match[1].length+1,y]);
    }
    if(filled.length===0){
      return false;
    }
    for(let [x,y] of filled){
      characterGrid[y][x] = edgeNumber.toString();
    }
    return true;
  }
  return false;
}

function pairDistance(pair: [string, string], nodeCoordinates: {[p: string]: [number, number]}) {
  let [x, y] = nodeCoordinates[pair[0]];
  let [x2, y2] = nodeCoordinates[pair[1]];
  return Math.abs(x - x2) + Math.abs(y - y2);
}

function findDiagonalDownPairs(nodeCoordinates: {[p: string]: [number, number]}) {
  let pairs = new Array<[string, string]>();
  let nodeNames = Object.keys(nodeCoordinates);
  nodeNames.sort();
  for (let ni = 0; ni < nodeNames.length; ni++) {
    let n = nodeNames[ni];
    let [x, y] = nodeCoordinates[n];
    for (let mi = ni + 1; mi < nodeNames.length; mi++) {
      let m = nodeNames[mi];
      let [x2, y2] = nodeCoordinates[m];
      if ((x2 > x && y2 > y) || (x2<x&&y2<y)) {pairs.push([n, m]);}
    }
  }

  // closest first
  pairs.sort((a, b) => pairDistance(a, nodeCoordinates) - pairDistance(b, nodeCoordinates));

  return pairs;
}
function findDiagonalUpPairs(nodeCoordinates: {[p: string]: [number, number]}) {
  let pairs = new Array<[string, string]>();
  let nodeNames = Object.keys(nodeCoordinates);
  nodeNames.sort();
  for (let ni = 0; ni < nodeNames.length; ni++) {
    let n = nodeNames[ni];
    let [x, y] = nodeCoordinates[n];
    for (let mi = ni + 1; mi < nodeNames.length; mi++) {
      let m = nodeNames[mi];
      let [x2, y2] = nodeCoordinates[m];
      if ((x2 > x && y2 < y) || (x2<x&&y2>y)) {pairs.push([n, m]);}
    }
  }

  pairs.sort((a, b) => pairDistance(a, nodeCoordinates) - pairDistance(b, nodeCoordinates));

  return pairs;
}

export function allSolutionEdges(lines: string[], console: Output): {
  matrixReplaced: string;
  matrixAfter: string;
  edges: [string, string][]
} {
  let nodeNames = allSolutionNodes(lines); // assume there are no duplicates
  let preSort:string[] = []
  let characterGrid = lines.map(l => l
    //.replace(' ','.')
    .split(''));
  let height = characterGrid.length;
  let width = Math.max(...characterGrid.map(l => l.length));
  let nodeCoordinates:{[name:string]:[number,number]} = {}; // node name -> [x, y]
  // this assumes that nodes are single characters
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = characterGrid[y][x]||' ';
      if (c.match(/\w/)) {nodeCoordinates[c] = [x, y];}
    }
  }
//  console.log({nodeCoordinates});
  // find horizontal edges
  let horizontalPairs = findHorizontalPairs(nodeCoordinates);
//  console.log({horizontalPairs});
  for(let pair of horizontalPairs){
    if(checkHorizontal(pair[0],pair[1],nodeCoordinates,characterGrid,preSort.length)){
      preSort.push(pair[0] + '-' + pair[1]);
    }
  }
  // find vertical edges
  let verticalPairs = findVerticalPairs(nodeCoordinates);
//  console.log({verticalPairs});
  for(let pair of verticalPairs){
    if(checkVertical(pair[0],pair[1],nodeCoordinates,characterGrid,preSort.length)){
      preSort.push(pair[0] + '-' + pair[1]);
    }
  }
  let diagonalDownPairs = findDiagonalDownPairs(nodeCoordinates);
//  console.log({diagonalDownPairs});
  for(let pair of diagonalDownPairs){
    if(checkRectangle(pair[0],pair[1],nodeCoordinates,characterGrid,preSort.length)){
      preSort.push(pair[0] + '-' + pair[1]);
  }
  }
  let diagonalUpPairs = findDiagonalUpPairs(nodeCoordinates);
//  console.log({diagonalUpPairs});
  for(let pair of diagonalUpPairs) {
    if (checkRectangle(pair[0], pair[1], nodeCoordinates, characterGrid, preSort.length)) {
      preSort.push(pair[0] + '-' + pair[1]);
    }
  }
  let matrixReplaced = characterGrid.map(l => l.join('')).join('\n');

  let matrixAfter = characterGrid.map((l,i) => l.join('').padEnd(width, ' ')+" | "+lines[i]).join('\n');
  console.log("```\n"+matrixAfter+"\n```");
  preSort.sort();
  let edges = new Array<[string, string]>();
  for (let e of preSort) {
    edges.push(e.split('-') as [string, string]);
  }
  return {matrixReplaced,matrixAfter,edges};
}

function findVerticalPairs(nodeCoordinates: {[p: string]: [number, number]}) {
  let pairs = new Array<[string, string]>();
  let nodeNames = Object.keys(nodeCoordinates);
  nodeNames.sort();
  for (let ni = 0; ni < nodeNames.length; ni++) {
    let n = nodeNames[ni];
    let [x, y] = nodeCoordinates[n];
    for (let mi = ni + 1; mi < nodeNames.length; mi++) {
      let m = nodeNames[mi];
      let [x2, y2] = nodeCoordinates[m];
      if (x === x2) {pairs.push([n, m]);}
    }
  }
  return pairs;
}

export function findHorizontalPairs(nodeCoordinates:{[name:string]:[number,number]}):[string,string][]{
  let pairs = new Array<[string,string]>();
  let nodeNames = Object.keys(nodeCoordinates);
  nodeNames.sort();
  for(let ni=0;ni<nodeNames.length;ni++){
    let n = nodeNames[ni];
    let [x,y] = nodeCoordinates[n];
    for(let mi=ni+1;mi<nodeNames.length;mi++){
      let m = nodeNames[mi];
      let [x2, y2] = nodeCoordinates[m];
      if (y === y2) {pairs.push([n, m]);}
    }
  }
  return pairs;
}

