import {
  dateTranscriptSegmentFromUnknown,
  type DateTranscriptQuoteSegment,
  type DateTranscriptSegment,
  type DateTranscriptTextSegment,
} from './dateTranscriptAttach';
import { stableQuoteId } from './quoteAttach';

function unescapeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

/** Slice top-level `{…}` objects from a JSON array body (string-aware). */
export function sliceTopLevelJsonObjects(arrayBody: string): {
  complete: string[];
  trailingIncomplete: string | null;
} {
  const complete: string[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objectStart = -1;

  for (let i = 0; i < arrayBody.length; i += 1) {
    const ch = arrayBody[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) {
        objectStart = i;
      }
      depth += 1;
      continue;
    }
    if (ch === '}') {
      if (depth === 0) {
        continue;
      }
      depth -= 1;
      if (depth === 0 && objectStart >= 0) {
        complete.push(arrayBody.slice(objectStart, i + 1));
        objectStart = -1;
      }
      continue;
    }
    if (ch === ']' && depth === 0) {
      break;
    }
  }

  const trailingIncomplete =
    depth > 0 && objectStart >= 0 ? arrayBody.slice(objectStart) : null;
  return { complete, trailingIncomplete };
}

function partialTextSegment(rawObject: string): DateTranscriptTextSegment | null {
  if (!/"type"\s*:\s*"text"/.test(rawObject)) {
    return null;
  }
  const textMatch = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(rawObject);
  if (!textMatch?.[1]) {
    // Open string still streaming — capture after "text": "
    const open = /"text"\s*:\s*"((?:\\.|[^"\\])*)$/.exec(rawObject);
    if (open?.[1] !== undefined) {
      const text = unescapeJsonString(open[1]).trim();
      return text ? { type: 'text', text } : { type: 'text', text: '' };
    }
    return { type: 'text', text: '' };
  }
  return { type: 'text', text: unescapeJsonString(textMatch[1]).trim() };
}

function partialQuoteSegment(rawObject: string): DateTranscriptQuoteSegment | null {
  if (!/"type"\s*:\s*"quote"/.test(rawObject)) {
    return null;
  }
  const speakerNameRaw =
    /"speakerName"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(rawObject)?.[1] ??
    /"speakerName"\s*:\s*"((?:\\.|[^"\\])*)$/.exec(rawObject)?.[1];
  const quoteRaw =
    /"quote"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(rawObject)?.[1] ??
    /"quote"\s*:\s*"((?:\\.|[^"\\])*)$/.exec(rawObject)?.[1];
  const speaker = /"speaker"\s*:\s*"([^"]+)"/.exec(rawObject)?.[1]?.trim();
  const id = /"id"\s*:\s*"([^"]+)"/.exec(rawObject)?.[1]?.trim();
  const speakerName = speakerNameRaw
    ? unescapeJsonString(speakerNameRaw).trim()
    : '…';
  const quote = quoteRaw ? unescapeJsonString(quoteRaw) : '';
  const segment: DateTranscriptQuoteSegment = {
    type: 'quote',
    quote,
    speakerName: speakerName || '…',
    ...(speaker ? { speaker } : {}),
  };
  segment.id = id || stableQuoteId(segment);
  return segment;
}

/**
 * Best-effort segment list from a (possibly incomplete) dateTranscript fence body.
 * Complete objects become segments immediately; a trailing incomplete object is
 * included when it already looks like text/quote so UI can stream it.
 */
export function extractDateTranscriptSegments(raw: string): DateTranscriptSegment[] {
  const dataMatch = /"data"\s*:\s*\{/.exec(raw);
  const fromData =
    dataMatch && dataMatch.index !== undefined
      ? raw.slice(dataMatch.index + dataMatch[0].length)
      : raw;
  const segmentsMatch = /"segments"\s*:\s*\[/.exec(fromData);
  if (!segmentsMatch || segmentsMatch.index === undefined) {
    return [];
  }
  const arrayBody = fromData.slice(segmentsMatch.index + segmentsMatch[0].length);
  const { complete, trailingIncomplete } = sliceTopLevelJsonObjects(arrayBody);
  const segments: DateTranscriptSegment[] = [];

  for (const chunk of complete) {
    try {
      const parsed = dateTranscriptSegmentFromUnknown(JSON.parse(chunk) as unknown);
      if (parsed) {
        segments.push(parsed);
        continue;
      }
    } catch {
      // fall through to regex partial
    }
    const partial =
      partialTextSegment(chunk) ?? partialQuoteSegment(chunk);
    if (partial) {
      segments.push(partial);
    }
  }

  if (trailingIncomplete) {
    const partial =
      partialTextSegment(trailingIncomplete) ??
      partialQuoteSegment(trailingIncomplete);
    if (partial) {
      segments.push(partial);
    }
  }

  return segments;
}
