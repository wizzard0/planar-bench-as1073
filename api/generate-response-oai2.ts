// https://platform.openai.com/docs/api-reference/responses

import type {Content, ToolItem} from "./oai-request.ts";
import type {Message, AnthropicOutputContent, AnthropicThinkingContent} from "./oai-reply.ts";
import type {ReplyMeta} from "./reply-meta.ts";
import {findModelConfig} from "./providers.ts";
import type {ResponseOpenAI2} from "./oai-reply-2.ts";

/**
 * Generate a response from a prompt using the OpenAI Responses API.
 * Streaming support lives alongside this helper in generate-response-oai2-stream.ts.
 * @returns A tuple containing the response content and metadata
 */
export async function generateResponseOpenAI2(x: Partial<ReplyMeta>, postParams: {
  [p: string]: string | number | null
}, headers: { [p: string]: string }, key: string, url: string): Promise<[AnthropicOutputContent, ReplyMeta]> {
  let{
    model, prompt,
    provider
  }=x;

  // Prepare request payload for Responses API
  const body = {
    model: model,
    input: prompt,
    ...postParams
  };

  for(let key in postParams){
    let value = postParams[key];
    if(value===null){
      // @ts-ignore
      delete body[key];
    }else{
      // @ts-ignore
      body[key] = value;
    }
  }

  const startTime = Date.now();
  
  // Make request to OpenAI Responses API
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'OpenAI-Beta': 'responses=v1',
      ...headers
    },
    body: JSON.stringify(body)
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  // Parse response
  const data = await response.json() as ResponseOpenAI2;
  
  // Create metadata
  const meta: ReplyMeta = {
    provider: provider!,
    model: model!,
    prompt: prompt!,
    code: response.status,
    // usage: data.usage || {},
    // id: data.id || '',
//    created: data.created || Date.now(),
//    duration: duration,
    response: JSON.stringify(data),
    error: data.error || '',
//    raw: data
  };

  // Format response in AnthropicOutputContent format for consistency
  const outputContent: AnthropicOutputContent = {
    type: 'text',
    text: data.output[data.output.length-1].content[0].text || 'error'
  };

  return [outputContent, meta];
}
