import { Client } from "@gradio/client";
import type {AnthropicOutputContent} from "./oai-reply.ts";

import type {ReplyMeta} from "./reply-meta.ts";



export async function queryHuggingfaceSpace(x: Partial<ReplyMeta>):Promise<[AnthropicOutputContent,ReplyMeta]> {
  let{
    model,prompt
  }=x;

  const client = await Client.connect(model!,{
    hf_token: process.env.HUGGINGFACE_TOKEN as `hf_${string}`,
  });
  const result = await client.predict("/chat", {
    message: prompt,
  });
  console.log({result});
  let text= (result.data as any)[0];
  // todo more meta processing
  let rm:ReplyMeta={
    ...x,
    response:text,
    code:200, // synthetic code
  } as ReplyMeta
  return [{text,type:'text'},rm];
}