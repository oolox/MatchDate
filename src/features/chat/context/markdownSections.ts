export interface MarkdownSection {
  /** Heading text without hashes. Empty for the preamble. */
  title: string;
  level: number;
  text: string;
}

/** Split markdown on headings from `#` through `####`. */
export function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection = { title: '', level: 0, text: '' };

  const push = () => {
    if (current.text.trim()) {
      sections.push(current);
    }
  };

  for (const line of lines) {
    const match = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (match) {
      push();
      current = {
        title: match[2].trim(),
        level: match[1].length,
        text: line,
      };
    } else {
      current = {
        ...current,
        text: current.text ? `${current.text}\n${line}` : line,
      };
    }
  }
  push();
  return sections;
}
