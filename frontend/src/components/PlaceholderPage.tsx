export function PlaceholderPage({ title, milestone }: { title: string; milestone: string }) {
  return (
    <section>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">Arrives in {milestone}.</p>
    </section>
  );
}
