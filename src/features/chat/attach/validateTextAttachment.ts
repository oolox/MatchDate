export const MAX_TEXT_ATTACHMENT_BYTES = 200 * 1024;
export const CHAT_ATTACH_WARN_CHARS = 6000;

export function mimeFromFileName(fileName: string): 'text/plain' | 'text/markdown' {
  return /\.md$/i.test(fileName) ? 'text/markdown' : 'text/plain';
}

export function isLikelyBinaryText(body: string): boolean {
  if (body.includes('\0')) {
    return true;
  }
  let suspicious = 0;
  const sample = body.slice(0, 2048);
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code < 32 && char !== '\n' && char !== '\r' && char !== '\t') {
      suspicious += 1;
    }
  }
  return suspicious > 8;
}

export function validateTextAttachmentBody(body: string): string | null {
  if (isLikelyBinaryText(body)) {
    return 'That file is not valid UTF-8 text';
  }
  const bytes = new TextEncoder().encode(body).byteLength;
  if (bytes > MAX_TEXT_ATTACHMENT_BYTES) {
    return `File is too large (max ${Math.round(MAX_TEXT_ATTACHMENT_BYTES / 1024)} KB)`;
  }
  return null;
}

export function validateTextAttachmentFile(file: File): string | null {
  if (file.size > MAX_TEXT_ATTACHMENT_BYTES) {
    return `File is too large (max ${Math.round(MAX_TEXT_ATTACHMENT_BYTES / 1024)} KB)`;
  }
  return null;
}
