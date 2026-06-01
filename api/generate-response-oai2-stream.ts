import type {Content} from "./oai-request.ts";
import type {ReplyMeta} from "./reply-meta.ts";
import type {ResponseOpenAI2} from "./oai-reply-2.ts";

interface StreamParams {
  prompt: Content;
  model: string;
  postParams: Record<string, unknown>;
  headers: {[key: string]: string};
  apiKey: string;
  futureMeta: Partial<ReplyMeta>;
  url: string;
}
const POLLABLE_STATUSES = new Set(["queued", "in_progress"]);
const BACKGROUND_MODEL_REGEX = /gpt-5/i;
const DEFAULT_POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 900; // 3 minutes with 2s interval

function applyPostParams(
  base: Record<string, unknown>,
  postParams: Record<string, unknown>
): Record<string, unknown> {
  for (let key in postParams) {
    const value = postParams[key];
    if (value === null) {
      delete base[key];
    } else {
      base[key] = value;
    }
  }
  return base;
}

function extractDeltaText(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data.delta === "string") return data.delta;
  if (typeof data.text === "string") return data.text;
  if (Array.isArray(data.delta)) {
    return data.delta.map((item: any) => (typeof item === "string" ? item : "")).join("");
  }
  return undefined;
}

function parseEventBlock(block: string): {eventType: string | null; data: any} | null {
  const lines = block.split("\n").map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let eventType: string | null = null;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;

  const dataString = dataLines.join("\n");
  if (dataString === "[DONE]") {
    return null;
  }

  try {
    const parsed = JSON.parse(dataString);
    const typeFromPayload = typeof parsed.type === "string" ? parsed.type : null;
    return {eventType: eventType || typeFromPayload, data: parsed};
  } catch (error) {
    console.error("Error parsing streaming payload", error, {block});
    return null;
  }
}

export async function* generateResponseOpenAI2Stream({
  prompt,
  model,
  postParams,
  headers,
  apiKey,
  futureMeta,
  url
}: StreamParams): AsyncGenerator<string | ReplyMeta, ReplyMeta> {
  const useBackgroundMode = BACKGROUND_MODEL_REGEX.test(model);
  const baseBody: Record<string, unknown> = {
    model,
    input: prompt
  };

  if (useBackgroundMode) {
    baseBody.background = true;
    baseBody.store = true;
  } else {
    baseBody.stream = true;
  }

  const body: Record<string, unknown> = applyPostParams(baseBody, postParams);

  if (useBackgroundMode) {
    delete body.stream;
    body.background = true;
    body.store = true;
  } else {
    body.stream = true;
  }

  console.log(useBackgroundMode ? 'background mode started' : 'streaming started');

  if (useBackgroundMode) {
    const finalResponse = await runBackgroundResponse({body, apiKey, headers, futureMeta, url});
    const text = extractOutputText(finalResponse);
    if (text) {
      yield text;
    }
    const meta = futureMeta as ReplyMeta;
    meta.response = JSON.stringify(finalResponse);
    yield meta;
    return meta;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "OpenAI-Beta": "responses=v1",
      ...headers
    },
    body: JSON.stringify(body)
  });

  futureMeta.code = response.status;
  futureMeta.error = response.statusText;

  if (!response.ok) {
    const errorText = await response.text();
    futureMeta.error = errorText;
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No reader available for streaming response");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: ResponseOpenAI2 | undefined;

  while (true) {
    const {value, done} = await reader.read();
    const chunk = value ?? new Uint8Array();
    buffer += decoder.decode(chunk, {stream: !done});

    const segments = buffer.split("\n\n");
    buffer = segments.pop() || "";

    for (const segment of segments) {
      const parsed = parseEventBlock(segment);
      if (!parsed) continue;

      const {eventType, data} = parsed;
      const type = eventType || "";

      //console.log('event', {type, data});
      process.stdout.write(`.`);

      if (type === "response.output_text.delta") {
        const delta = extractDeltaText(data);
        if (delta) {
          yield delta;
        }
      } else if (type === "response.error" || type === "error") {
        const message = data?.error?.message || JSON.stringify(data);
        futureMeta.error = message;
        throw new Error(`OpenAI streaming error: ${message}`);
      } else if (type === "response.completed") {
        if (data?.response) {
          finalResponse = data.response as ResponseOpenAI2;
        }
      }
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim().length > 0) {
    const parsed = parseEventBlock(buffer);
    if (parsed) {
      const {eventType, data} = parsed;
      const type = eventType || "";
      if (type === "response.output_text.delta") {
        const delta = extractDeltaText(data);
        if (delta) {
          yield delta;
        }
      } else if (type === "response.completed" && data?.response) {
        finalResponse = data.response as ResponseOpenAI2;
      }
    }
  }

  const meta = futureMeta as ReplyMeta;
  meta.response = JSON.stringify(finalResponse ?? {type: "streamed"});
  yield meta;
  return meta;
}

async function runBackgroundResponse({
  body,
  apiKey,
  headers,
  futureMeta,
  url
}: {
  body: Record<string, unknown>;
  apiKey: string;
  headers: {[key: string]: string};
  futureMeta: Partial<ReplyMeta>;
  url: string;
}): Promise<ResponseOpenAI2> {
  const requestHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "OpenAI-Beta": "responses=v1",
    ...headers
  };

  const createResponse = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body)
  });

  futureMeta.code = createResponse.status;
  futureMeta.error = createResponse.statusText;

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    futureMeta.error = errorText;
    throw new Error(`OpenAI API error: ${createResponse.status} ${errorText}`);
  }

  let responsePayload = await createResponse.json() as ResponseOpenAI2;

  let attempts = 0;
  let delayMs = DEFAULT_POLL_INTERVAL_MS;

  while (POLLABLE_STATUSES.has(responsePayload.status) && attempts < MAX_POLL_ATTEMPTS) {
    await sleep(delayMs);
    attempts += 1;

    const pollResponse = await fetch(`${url}/${responsePayload.id}`, {
      method: "GET",
      headers: requestHeaders
    });

    futureMeta.code = pollResponse.status;
    futureMeta.error = pollResponse.statusText;

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      futureMeta.error = errorText;
      console.log(`OpenAI background polling error: ${pollResponse.status} ${errorText}`);
      await sleep(delayMs*2);
      continue;
    }

    responsePayload = await pollResponse.json() as ResponseOpenAI2;
    process.stdout.write(responsePayload.status.substring(0,1));
    // console.log(`background status: ${responsePayload.status} ${JSON.stringify(responsePayload)} ${new Date().toISOString()}`);

    // increase delay gradually but cap it to avoid excessive waiting
    delayMs = Math.min(delayMs * 1.5, 15000);
  }

  if (POLLABLE_STATUSES.has(responsePayload.status)) {
    futureMeta.error = `background response did not complete after ${attempts} attempts`;
    throw new Error(futureMeta.error);
  }

  if (responsePayload.status !== "completed") {
    futureMeta.error = `background response finished with status ${responsePayload.status}`;
    throw new Error(futureMeta.error);
  }

  return responsePayload;
}

function extractOutputText(response: ResponseOpenAI2): string {
  const textSegments: string[] = [];

  const outputText = (response as any).output_text;
  if (Array.isArray(outputText)) {
    textSegments.push(...outputText.filter(segment => typeof segment === "string"));
  }

  if (Array.isArray(response.output)) {
    for (const output of response.output) {
      if (!output?.content) continue;
      for (const content of output.content as any[]) {
        if (typeof content?.text === "string") {
          textSegments.push(content.text);
        }
      }
    }
  }

  return textSegments.join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
