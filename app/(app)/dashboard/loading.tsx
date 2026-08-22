export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="bg-muted h-24 animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="bg-muted h-64 animate-pulse rounded-lg" />
    </div>
  );
}
