export type Content = string | (ContentItem|ImageItem)[];

export interface ContentItem {
  type: "text",
  text: string
}

export interface ImageItem {
  type: "image",
  source:{
    "type": "base64",
    "media_type": "image/jpeg" | "image/png" | "image/gif" | "image/webp",
    "data": string, // base64 encoded
  }
}

type Role = "user" | "assistant" | "system"; // system if oai

export interface OpenAIRequest {
  system?: string;// anthropic
  temperature: number;
  messages: { role: Role; content: Content }[];
  tool_choice?: 'none' | 'auto' | 'required';
  model: string;
  max_tokens?: number;
  stream?: boolean
  tools?: ToolItem[];
}

export interface ToolItem {
  function: {
    name: string;
    description: string;
    strict: boolean;
    parameters: { type: string; properties: { direction: { description: string; type: string } }; required: string[] }
  };
  type: string;
}