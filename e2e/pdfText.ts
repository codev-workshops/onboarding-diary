import { inflateSync } from 'node:zlib';

/**
 * Extracts the visible text from a pdfkit-generated PDF without a third-party
 * parser. pdfkit compresses its content streams with FlateDecode and draws text
 * via `Tj`/`TJ` operators using hex strings (`<48656c6c6f>`) split into chunks by
 * kerning, so we inflate each stream and concatenate the hex/literal chunks per
 * line. Validates content presence, not layout.
 */
export function extractPdfText(pdf: Buffer): string {
  const out: string[] = [];
  let searchFrom = 0;
  for (;;) {
    const streamIdx = pdf.indexOf('stream', searchFrom);
    if (streamIdx === -1) break;
    const endIdx = pdf.indexOf('endstream', streamIdx);
    if (endIdx === -1) break;
    searchFrom = endIdx + 'endstream'.length;

    let start = streamIdx + 'stream'.length;
    if (pdf[start] === 0x0d) start += 1;
    if (pdf[start] === 0x0a) start += 1;
    const raw = pdf.subarray(start, endIdx);
    let content: Buffer;
    try {
      content = inflateSync(raw);
    } catch {
      continue;
    }
    out.push(decodeTextOperators(content.toString('latin1')));
  }
  return out.join('\n');
}

function decodeTextOperators(content: string): string {
  const lines: string[] = [];
  const token = /<([0-9A-Fa-f]*)>|\(((?:\\.|[^\\()])*)\)/g;
  for (const line of content.split('\n')) {
    if (!/\bT[jJ]\b/.test(line)) continue;
    let m: RegExpExecArray | null;
    let text = '';
    while ((m = token.exec(line)) !== null) {
      if (m[1] !== undefined) {
        text += Buffer.from(m[1], 'hex').toString('latin1');
      } else {
        text += m[2]
          .replace(/\\(\d{3})/g, (_s, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\([()\\])/g, '$1');
      }
    }
    token.lastIndex = 0;
    if (text) lines.push(text);
  }
  return lines.join('\n');
}
