import {planarGraphByNumber, planarListG6} from "./planar.ts";
import util from "node:util";
import fs from "node:fs";
import {adjToEdgeMap, graph6ToAdj} from "./claude-parser.ts";
import type {Graph} from "../validation/tasks.ts";

export const loadEdgeMap: (group: number, groupIndex: number) => Promise<{
  g6: string;
  map: Graph
}> = async (group: number, groupIndex: number) => {
  let allGraphsForXVertices = (await util.promisify(fs.readFile)(`graphs/planar/${group}.g6`, 'utf8')).trim();
  let g6 = allGraphsForXVertices.split('\n')[groupIndex];
  // console.log({allGraphsForXVertices, groupIndex, specificGraph})
  let [vertices, matrix] = graph6ToAdj(g6);
  let map = adjToEdgeMap(matrix);
  return {g6, map};
}
export const findGraph = (index: number) => {
  let [numVerticesGroup, groupIndex] = planarGraphByNumber(index);
  let [prevGroup, prevIndex] = planarGraphByNumber(index - 1);
  let titleIsNeeded = numVerticesGroup != prevGroup;
  let numGraphs = planarListG6[numVerticesGroup][1];
  return {numVerticesGroup, groupIndex, titleIsNeeded, numGraphs};
}