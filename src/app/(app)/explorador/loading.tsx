export default function ExploradorLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="h-6 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="h-40 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]" />
        ))}
      </div>
    </div>
  );
}
