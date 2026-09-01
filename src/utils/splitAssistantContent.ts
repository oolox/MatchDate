export type AssistantMessageBlock = { type: 'markdown'; content: string };

export interface SplitAssistantContentOptions {
  isStreaming?: boolean;
}

export function splitAssistantContent(
  content: string,
  _options: SplitAssistantContentOptions = {},
): AssistantMessageBlock[] {
  if (!content.trim()) {
    return [];
  }
  return [{ type: 'markdown', content }];
}
