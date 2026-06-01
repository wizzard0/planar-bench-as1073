import type {AnthropicOutputContent, AnthropicThinkingContent, Message} from "./oai-reply.ts";
import util from "node:util";

export function unwrapResponse(resp: Message | AnthropicOutputContent|AnthropicThinkingContent): string {
  let possibleText = "";
  if ((resp as AnthropicOutputContent).text) {
//    console.log('using anthropic pattern');
    possibleText = (resp as AnthropicOutputContent).text;
  } else if ((resp as AnthropicThinkingContent).thinking) {
//    console.log('using anthropic pattern');
    possibleText = (resp as AnthropicThinkingContent).thinking;
  } else if((resp as Message).content) {
//    console.log('using oai pattern');
    possibleText = (resp as Message).content;
  }else{
    console.log('unknown pattern');
    return util.inspect(resp)
  }

  // r1 reasoning
  if (possibleText.includes('<think>')) {
    console.log('using r1 pattern');
    // r1 reasoning
    // remove everything within <think> tags, replace with '...' and length of removed text
    let regex = /<think>([\s\S]*?)<\/think>/g;
    let removed = possibleText.match(regex);
    if (removed) {
      let removedLength = removed[0].length;
      let replacement = 'thinking: ' + removedLength + ' characters\n';
      possibleText = possibleText.replace(regex, replacement);
    } else {
//      console.log('no think tags found');
    }
  }

  // steiner reasoning
  if (possibleText.includes('<|reasoning_start|>')) {
    console.log('using steiner pattern');
    // r1 reasoning
    // remove everything within <think> tags, replace with '...' and length of removed text
    let regex = /<\|reasoning_start\|>([\s\S]*?)<\|reasoning_end\|>/g;
    let removed = possibleText.match(regex);
    if (removed) {
      let removedLength = removed[0].length;
      let replacement = 'thinking: ' + removedLength + ' characters\n';
      possibleText = possibleText.replace(regex, replacement);
    } else {
//      console.log('no think tags found');
    }
  }

  return possibleText;
}