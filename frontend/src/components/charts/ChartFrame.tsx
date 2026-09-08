import type { ReactNode } from 'react';

export interface ChartColumn {
  label: string;
  values: string[];
}

/**
 * Wraps a chart in a labelled figure and repeats its numbers in a visually hidden table, so the
 * values are never conveyed by the drawing (or by colour) alone.
 */
export function ChartFrame({
  title,
  headers,
  rows,
  empty,
  children,
}: {
  title: string;
  headers: string[];
  rows: ChartColumn[];
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="rounded-lg border border-slate-200 bg-white p-4">
      <figcaption className="text-sm font-medium text-slate-700">{title}</figcaption>
      {empty ? (
        <p className="mt-3 text-sm text-slate-600">Nothing to chart yet.</p>
      ) : (
        <>
          <div className="mt-3">{children}</div>
          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={headers[index + 1]}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
