/** CSV renderer: one `# SECTION:` block per requested section (TRD 4.6). */

import {
  EMPTY_SECTION_TEXT,
  REPORT_SECTION_HEADERS,
  reportSectionRows,
  type ReportData,
} from './assemble.js';

/** Quote a field when it contains a delimiter, quote, or newline, doubling inner quotes. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function renderCsv(data: ReportData): string {
  const lines: string[] = [
    `# ONBOARDING DIARY REPORT`,
    `# Recruit: ${data.owner.fullName}`,
    `# Range: ${data.from} to ${data.to}`,
    `# Generated: ${data.generatedAt.toISOString()}`,
  ];

  for (const section of data.sections) {
    const rows = reportSectionRows(data, section);
    lines.push('', `# SECTION: ${section}`);
    lines.push(REPORT_SECTION_HEADERS[section].map(csvField).join(','));
    if (rows.length === 0) {
      lines.push(`# ${EMPTY_SECTION_TEXT}`);
      continue;
    }
    for (const row of rows) lines.push(row.map(csvField).join(','));
  }

  return `${lines.join('\r\n')}\r\n`;
}
