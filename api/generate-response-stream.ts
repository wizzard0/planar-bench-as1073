import type {Content, ToolItem, OpenAIRequest} from "./oai-request.ts";
import type {ReplyMeta} from "./reply-meta.ts";
import {findModelConfig} from "./providers.ts";
import type {Message, AnthropicOutputContent, AnthropicThinkingContent} from "./oai-reply.ts";
import util from "node:util";
import {generateResponseOpenAI2Stream} from "./generate-response-oai2-stream.ts";

export async function* generateResponseStream(prompt: Content, possibleActions: ToolItem[], findModel: string): AsyncGenerator<string | ReplyMeta, ReplyMeta> {
  let {provider, providerName, model, wait, postParams, headers} = findModelConfig(findModel)
  let {url} = provider
  let key = process.env[provider.env]
  let futureMeta: Partial<ReplyMeta> = {
    provider: providerName,
    model,
    prompt: prompt as string,
  };

  if (wait > 0) {
    console.log('waiting', wait, 'seconds');
    await new Promise(resolve => setTimeout(resolve, wait * 1000));
  }

  if (!key) {
    throw new Error(`missing api key for provider ${provider.env}`);
  }

  if (providerName === 'openai2') {
    return yield* generateResponseOpenAI2Stream({
      prompt,
      model,
      postParams,
      headers,
      apiKey: key,
      futureMeta,
      url
    });
  }

  try {
    let body: OpenAIRequest = {
      model: model,
      messages: [{role: 'user', content: prompt}],
      max_tokens: 8192,
      temperature: 0,
      stream: true
    };

    // body patching
    for (let key in postParams) {
      let value = postParams[key];
      if (value === null) {
        // @ts-ignore
        delete body[key];
      } else {
        // @ts-ignore
        body[key] = value;
      }
    }
//    console.log({stream:url})

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        ...headers
      } as any,
      body: JSON.stringify(body),
    });

    futureMeta.code = response.status;
    futureMeta.error = response.statusText;

    if (!response.ok) {
      let text= await response.text();
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText} ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const {value, done} = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, {stream: true});

      // Split buffer into lines and process each complete line
      const lines = buffer.split('\n');
      buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

      for (const line of lines) {
        process.stderr.write('.');

//        console.log("LINE: "+line)
        if (line.trim() === '') continue;
        if (line.includes('data: [DONE]')) continue;

        // Handle both event and data lines
        if (line.startsWith('event:')) continue; // Skip event lines
        if (line.includes('OPENROUTER PROCESSING')){
          process.stdout.write('~');
          continue
        } // specific noise from openrouter

        const data = line.replace(/^data: /, '');
        try {
          const json = JSON.parse(data);

          // Handle different streaming formats
          if ('choices' in json) { // OpenAI format
            const content = json.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } else if ('type' in json && json.type === 'content_block_delta') { // Anthropic format
            const content = json.delta?.text;
            if (content) {
              yield content;
              process.stderr.write('.');
            }
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
          console.warn('data:', data);
          continue;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim() !== '') {
      try {
        const json = JSON.parse(buffer.replace(/^data: /, ''));
        const content = json.choices?.[0]?.delta?.content || json.delta?.text;
        if (content) yield content;
      } catch (e) {
        console.error('Error parsing final buffer:', e);
      }
    }

    // Set the response text in metadata before returning
    futureMeta.response = 'streaming response';
    const meta = futureMeta as ReplyMeta;
    yield meta;
    return meta;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function collectResponse(stream: AsyncGenerator<string | ReplyMeta, ReplyMeta>): Promise<[Message | AnthropicOutputContent | AnthropicThinkingContent, ReplyMeta]> {
  let fullText = '';
  let meta: ReplyMeta | undefined;

  // todo capture thinking tokens as well

  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      fullText += chunk;
    } else {
      // If we get a non-string value, it's our metadata
      meta = chunk as ReplyMeta;
    }
  }

  if (!meta) {
    throw new Error('No metadata received from stream');
  }

  meta.response = JSON.stringify({
    type: 'streamed',
    text: fullText
  })

  console.log(util.inspect(meta));
  if(fullText==''){
    meta.code=444;
    meta.error="empty response (context overflow?)";
  }

  // Create response object matching the format from generateResponse
  if (meta.provider === 'anthropic') {
    return [{
      type: 'text',
      text: fullText
    } as AnthropicOutputContent, meta];
  } else {
    // OpenAI format
    return [{
      role: 'assistant',
      content: fullText,
      tool_calls: [],
      refusal: null
    } as Message, meta];
  }
}
