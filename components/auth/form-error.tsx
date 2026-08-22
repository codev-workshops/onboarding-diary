export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
      {message}
    </p>
  );
}
