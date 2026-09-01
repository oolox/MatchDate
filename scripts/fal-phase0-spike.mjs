/**
 * Phase 0 — prove FAL chat streaming works (live API).
 *
 * Usage: npm run fal:spike
 * Reads VITE_FAL_KEY from .env. Costs a small amount of fal credits.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
  const path = resolve(process.cwd(), '.env');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requireFalKey() {
  const key = process.env.VITE_FAL_KEY?.trim();
  if (!key) {
    throw new Error('Missing VITE_FAL_KEY in .env');
  }
  return key;
}

async function spikeChatStream(apiKey) {
  console.log('\n=== Phase 0: FAL chat stream ===');
  const response = await fetch(
    'https://fal.run/openrouter/router/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-flash',
        stream: true,
        response_format: { type: 'text' },
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Reply with exactly: matchdate-phase0-ok' },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `chat HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`,
    );
  }
  if (!response.body) {
    throw new Error('chat response missing body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') {
        console.log('streamed reply:', text);
        return text;
      }
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          process.stdout.write(delta);
        }
      } catch {
        // skip malformed SSE
      }
    }
  }

  console.log('\nstreamed reply (eof):', text);
  return text;
}

async function main() {
  loadDotEnv();
  const apiKey = requireFalKey();
  const started = Date.now();
  const reply = await spikeChatStream(apiKey);
  console.log('\n=== Phase 0 PASSED ===');
  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsedMs: Date.now() - started,
        replyLength: reply.length,
        replyPreview: reply.slice(0, 120),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('\nPhase 0 spike FAILED');
  console.error(error);
  process.exitCode = 1;
});
