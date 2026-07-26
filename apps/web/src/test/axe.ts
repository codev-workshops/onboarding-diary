/**
 * Accessibility assertion helper (T-191). axe-core is run against the rendered container with
 * the WCAG 2 A/AA rule sets only, so the suite fails on the criteria the TRD commits to
 * (labels, contrast, roles, focus order) rather than on best-practice advice.
 *
 * `color-contrast` is disabled because jsdom has no layout or computed colours, so axe cannot
 * evaluate it — contrast is covered by the manual checklist in docs/ACCESSIBILITY.md.
 */

import axe from 'axe-core';

export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });

  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (violation) =>
          `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}\n` +
          violation.nodes.map((node) => `    ${node.html}`).join('\n'),
      )
      .join('\n');
    throw new Error(`Accessibility violations found:\n${summary}`);
  }
}
