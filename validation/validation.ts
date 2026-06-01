import type {Graph} from "./tasks.ts";
import {allSolutionEdges, allSolutionNodes} from "./parse-solution.ts";
import {allTaskEdges, allTaskNodes} from "./task-nodes.ts";
import {extractBlock} from "./markdown.ts";
import type {Output} from "../scenarios/console-like.ts";

export function validateGraph(text: string, graph: Graph, conditions: any,console:Output): boolean | string {
  let blockLines = extractBlock(text);
  if (blockLines.length === 0) {
    console.log('```\nwarning 1:===\n' + text+"\n===\n```");
    return 'no chart found';}
  let taskNodes = allTaskNodes(graph);
  let chartNodes = allSolutionNodes(blockLines);
  let missingNodes = taskNodes.filter(n => !chartNodes.includes(n));
  let problems:string[]=[];
  if (missingNodes.length > 0) {
    problems.push( `missing nodes: ${missingNodes.join(', ')}`);
  }
  let extraNodes = chartNodes.filter(n => !taskNodes.includes(n));
  if (extraNodes.length > 0) {
    problems.push(  `extra nodes: ${extraNodes.join(', ')}`)
  }
  let duplicateNodes = chartNodes.filter((n, i) => chartNodes.indexOf(n) !== i);
  if (duplicateNodes.length > 0) {
    problems.push(  `duplicate nodes: ${duplicateNodes.join(', ')}`);
  }
  if (problems.length > 0) {
    console.log('warning 2:===\n' + blockLines.join('\n')+"\n===\n");
    return problems.join('; ');
  }

  // now edges
  let {matrixReplaced,matrixAfter,edges} = allSolutionEdges(blockLines,console);
  if(matrixReplaced.match(/[-|/\\]/)){
    problems.push('broken edges');
  }
  console.log("edgesDetected", edges.map(e => e.join('-')).join(', '));
  let taskEdges = allTaskEdges(graph);
  //console.log("edgesExpected", taskEdges.map(e => e.join('-')).join(', '));
  let missingEdges = taskEdges.filter(e => !edges.some(f => f[0] === e[0] && f[1] === e[1]));
  let extraEdges = edges.filter(e => !taskEdges.some(f => f[0] === e[0] && f[1] === e[1]));
  if (missingEdges.length > 0) {
    problems.push( `missing edges: ${missingEdges.map(e => e.join('-')).join(', ')}`);
  }
  if (extraEdges.length > 0) {
    problems.push(  `extra edges: ${extraEdges.map(e => e.join('-')).join(', ')}`);
  }
  if (problems.length > 0) {
    return problems.join('; ');
  }

  return true;
}

