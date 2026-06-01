import {formatGraph, promptFromGraph} from "../validation/tasks.ts";
import {findGraph, loadEdgeMap} from "../graphs/load-edge-map.ts";
import {makeConsoleLike} from "./console-like.ts";
import {generateResponse} from "../api/generate-response.ts";
import {validateGraph} from "../validation/validation.ts";
import {unwrapResponse} from "../api/unwrap-response.ts";
import {writeStatPoint} from "../stat/stat.ts";
import type {AnthropicOutputContent, AnthropicThinkingContent, Message} from "../api/oai-reply.ts";
import {extractBlock} from "../validation/markdown.ts";
import {findModelConfig} from "../api/providers.ts";
import type {ReplyMeta} from "../api/reply-meta.ts";
import {collectResponse, generateResponseStream} from "../api/generate-response-stream.ts";

export async function processOne(index: number, destPath: string, findModel: string, version: string) {
  let {numVerticesGroup, groupIndex, titleIsNeeded, numGraphs} = findGraph(index);
  let console = makeConsoleLike(destPath);

  if (titleIsNeeded) {
    console.log(`## ${numVerticesGroup} vertices (${numGraphs} graphs)\n`);
  }
  let {g6, map} = await loadEdgeMap(numVerticesGroup, groupIndex);
  let textual = formatGraph(map);

  console.log(new Date().toISOString(), findModel);
  console.log( `${index}. \`${g6}\`: ${textual}\n`);

let start = Date.now();
  let resp:Message|AnthropicOutputContent|AnthropicThinkingContent;
  let prompt = promptFromGraph(map);
  let partialMeta:ReplyMeta;
  try {
    let {provider,providerName,model,wait,postParams,prefix,headers} = findModelConfig(findModel);
    if(prefix){
      prompt = prefix+"\n"+prompt;
    }
    if(postParams.stream){
      let stream = generateResponseStream(prompt, [], findModel);
      [resp, partialMeta] = await collectResponse(stream);
    }else {
      [resp, partialMeta] = await generateResponse(prompt, [], findModel);
    }
  }catch (e:any){
    resp={text:e.message,type:"error"};
    partialMeta = {
      prompt:prompt as string,
      error:e.message,
      model:'error',
      provider:'error',
      code:444,
      response:'error',
    }
  }
  let end = Date.now();
  let seconds = ((end-start)/1000).toFixed(1);
  let text = unwrapResponse(resp);
  if(text=='The operation timed out'){
    console.log('### TIMEOUT vvv');
    console.log(resp)
    console.log('### TIMEOUT ^^^');
  }
  let matrix = extractBlock(text).join('\n');

  let validationResult = validateGraph(text,map,{},console);
  let isValid = validationResult === true;
  let error_msg = isValid?"":validationResult as string;
  console.log(`### ${seconds}s: ${validationResult}`);

  writeStatPoint({
    index,
    dur:+seconds,
    time:new Date().toISOString(),
    matrix,
    model:findModel,
    error:error_msg,
    valid:isValid?1:0,
    vertices:numVerticesGroup,
    prompt,
    http_code:partialMeta.code,
    http_error:partialMeta.error,
    provider:partialMeta.provider,
    reply:partialMeta.response,
    version,
  })
}
