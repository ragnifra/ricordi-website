// Layout for the free-text product fields (description, authenticity notes).
//
// The stored value stays plain text — nothing here produces or accepts HTML,
// and no markdown library is involved. This only groups the author's own line
// breaks into blocks at render time, so the same string can be re-edited in
// the admin textarea unchanged.
//
// Client-importable on purpose — no server-only imports here.

export type TextBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] };

// The two markers an author actually types for a bullet.
const BULLET = /^[-•]\s*/;

// Textarea submissions normalise line breaks to CRLF, and older rows may hold
// either. Callers that store text normalise on the way in (see
// readProductFormValues); this is the matching defence on the way out.
export function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

// Blank lines separate blocks. Runs of bullet lines become one list; every
// other run of non-blank lines becomes one paragraph, keeping its internal
// line breaks as soft breaks.
export function parseTextBlocks(value: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  function flush() {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraph });
      paragraph = [];
    }
    if (list.length > 0) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
  }

  for (const rawLine of normalizeLineBreaks(value).split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    if (BULLET.test(line)) {
      const item = line.replace(BULLET, "").trim();
      // A lone marker with nothing after it is a stray keystroke, not a bullet.
      if (!item) continue;
      if (paragraph.length > 0) flush();
      list.push(item);
      continue;
    }

    if (list.length > 0) flush();
    paragraph.push(line);
  }

  flush();

  return blocks;
}
