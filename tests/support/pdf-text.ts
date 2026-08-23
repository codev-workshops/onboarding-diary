/**
 * Reads the text back out of a generated PDF so tests can assert on what a
 * reader would see. Asserting on bytes would prove the file exists; asserting
 * on extracted text is what proves a manager's document has no note in it.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function pdfPageTexts(bytes: Uint8Array): Promise<string[]> {
  const document = await getDocument({
    data: new Uint8Array(bytes),
    // A report must render from its own bytes alone (SEC-14), so nothing here
    // is allowed to reach the filesystem or the network either.
    useSystemFonts: false,
  }).promise;

  const pages: string[] = [];

  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();

    // pdf.js emits one item per drawn string, so words that were laid out
    // separately are joined here; a space between items keeps them apart.
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  await document.cleanup();

  return pages;
}
