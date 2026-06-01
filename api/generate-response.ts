// from p4a28-cap, copy1
import colors from "colors/safe";
import type {AnthropicOutputContent, AnthropicReply, AnthropicThinkingContent, Message} from "./oai-reply.ts";
import type {Content, OpenAIRequest, ToolItem} from "./oai-request.ts";
import {findModelConfig} from "./providers.ts";
import {queryHuggingfaceSpace} from "./huggingface.ts";
import type {ReplyMeta} from "./reply-meta.ts";
import {generateResponseOpenAI2} from "./generate-response-oai2.ts";

const {blue} = colors;

export async function generateResponse(prompt: Content, possibleActions:ToolItem[], findModel:string): Promise<[Message|AnthropicOutputContent|AnthropicThinkingContent, ReplyMeta]> {
  let {provider,providerName,model,wait,postParams,headers} = findModelConfig(findModel)
  let {url} = provider
  let key = process.env[provider.env]
  let futureMeta:Partial<ReplyMeta>={
      provider:providerName,
    model,
    prompt:prompt as string,
  };

  if(wait>0) {
    console.log('waiting',wait,'seconds');
    await new Promise(resolve => setTimeout(resolve, wait * 1000));
  }

  if(providerName=='huggingface'){
    // hack
    return await queryHuggingfaceSpace(futureMeta)
  }
  if(providerName=='openai2'){
    return await generateResponseOpenAI2(futureMeta, postParams, headers, key!, url)
  }
  let data:AnthropicReply|null=null;
  let text:string='???';
//  console.log(blue('prompt:'), prompt);
  try {
    let body: OpenAIRequest = {
      model: model,
      messages: [{role: 'user', content: prompt}],
      max_tokens: 4096,
      temperature: 0,//.7,
      // tools:possibleActions,
      // tool_choice:'required' //'none', 'auto', 'required', {"type": "function", "function": {"name": "my_function"}}
    };
    // body patching
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
    //console.log({postParams,body});
//    console.log({querying:url})
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'x-api-key': key,
        'anthropic-version':'2023-06-01',
        'Content-Type': 'application/json',
        ...headers
      } as any,
      body: JSON.stringify(body),
      // off
      // @ts-ignore
      timeout: false,
    });
    futureMeta.code = response.status;
    futureMeta.error = response.statusText;
    text= await response.text();
    futureMeta.response = text;

    if (!response.ok) {
      return [{text: `http error ${response.status} ${response.statusText} ${text}` , type: 'error'}, futureMeta as ReplyMeta];
    }
    if(response.status!==200){
      console.warn({status:response.status, text,statusText:response.statusText});
    }
    try {
       data = JSON.parse(text) as AnthropicReply;
    }catch (e:any){
      futureMeta.error = e.message;
      return [{text: "json error", type: 'error'}, futureMeta as ReplyMeta];
    }
    if('provider' in data){
      futureMeta.provider = ''+data.provider
    }

    // todo streaming required for deepseek bc it timeouts after 60s
//    console.log(JSON.stringify(data));
//     console.log(blue('response:'), util.inspect(data,{depth:null,colors:true}));
    if ('choices' in data) { // xai
      //console.log('using xai pattern');
      return [((data as any).choices[0].message as Message), futureMeta as ReplyMeta];
    }
    // ollama
    if('message' in data){
      return [data.message as Message, futureMeta as ReplyMeta];
    }
//    const message = data.choices[0].message; // oai
//    message.tool_calls[0].function.
    return [data.content[data.content.length-1], futureMeta as ReplyMeta];
  } catch (error) {
    console.error('Error:', error);
    console.log({data,text});
    throw error;
//    return 'An error occurred while generating the response.';
  }
}

