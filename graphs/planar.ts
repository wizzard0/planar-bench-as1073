// https://users.cecs.anu.edu.au/~bdm/data/graphs.html
export let planarListG6:[number,number][]= [
  [0,0],
  [1,1],
  [2,1],
  [3,2],
  [4,6],
  [5,20],
  [6,99],
  [7,646],
  [8,5974],
  [9,71885],
]

export function planarGraphByNumber(n:number):[number,number]{
  let cumPrevGraphs =0;
  let desiredVertices=0;
  while(cumPrevGraphs+planarListG6[desiredVertices][1]<=n){
    cumPrevGraphs+=planarListG6[desiredVertices][1];
    desiredVertices++;
  }
  return [desiredVertices,n-cumPrevGraphs];
}

export function test(){
  for(let i=0;i<11;i++){
    console.log(i, planarGraphByNumber(i));
  }
}

//test()