export interface OpenAIReply {
  id:                 string;
  object:             string;
  created:            number;
  model:              string;
  choices:            Choice[];
  usage:              Usage;
  system_fingerprint: string;
}

export interface Choice {
  index:         number;
  message:       Message;
  logprobs:      null;
  finish_reason: string;
}

export interface Message {
  role:       string;
  content:    string;
  tool_calls: ToolCall[];
  refusal:    null;
}

export interface ToolCall {
  id:       string;
  type:     string;
  function: FunctionCall;
}

export interface FunctionCall {
  name:      string;
  arguments: string;
}

export interface Usage {
  prompt_tokens:             number;
  completion_tokens:         number;
  total_tokens:              number;
  prompt_tokens_details:     PromptTokensDetails;
  completion_tokens_details: CompletionTokensDetails;
}

export interface CompletionTokensDetails {
  reasoning_tokens: number;
}

export interface PromptTokensDetails {
  cached_tokens: number;
}

///////////////////

export interface AnthropicReply {
  id:            string;
  type:          string;
  role:          string;
  model:         string;
  content:       (AnthropicOutputContent|AnthropicThinkingContent)[];
  stop_reason:   string;
  stop_sequence: null;
  usage:         AnthropicUsage;
}

export interface AnthropicOutputContent {
  type: string;
  text: string;
}

export interface AnthropicThinkingContent {
  type: 'thinking';
  thinking: string;
}

export interface AnthropicUsage {
  input_tokens:  number;
  output_tokens: number;
}
