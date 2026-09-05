import type { Character } from '../../../types/character';
import { wrapAttachedCharacter } from './jsonAttach';

export const ATTACHED_FILES_INSTRUCTION =
  'The user attached file(s). Treat them as source material. Quote by filename when you use them.';

export interface AttachFileBody {
  name: string;
  mime: string;
  body: string;
}

export interface AttachCharacterBody {
  character: Character;
  guid: string;
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapCdata(body: string): string {
  return body
    .split(']]>')
    .map((part) => `<![CDATA[${part}]]>`)
    .join(']]&gt;');
}

export function wrapAttachedFile(name: string, mime: string, body: string): string {
  return `<attached_file name="${escapeXmlAttr(name)}" mime="${escapeXmlAttr(mime)}">${wrapCdata(body)}</attached_file>`;
}

export function composeAttachedUserContent(
  userText: string,
  files: AttachFileBody[],
  characters: AttachCharacterBody[] = [],
): string {
  if (files.length === 0 && characters.length === 0) {
    return userText;
  }

  const parts: string[] = [];
  const prose = userText.trim();
  if (prose) {
    parts.push(prose);
  }

  if (files.length > 0) {
    const blocks = files.map((file) => wrapAttachedFile(file.name, file.mime, file.body)).join('\n');
    parts.push(`${ATTACHED_FILES_INSTRUCTION}\n${blocks}`);
  }

  if (characters.length > 0) {
    parts.push(
      characters
        .map((entry) => wrapAttachedCharacter(entry.character, entry.guid))
        .join('\n\n'),
    );
  }

  return parts.join('\n\n');
}

export function apiContentForMessage(message: {
  content: string;
  apiContent?: string;
}): string {
  return message.apiContent ?? message.content;
}
