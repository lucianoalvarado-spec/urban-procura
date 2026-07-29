export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]" />
        <div className="h-64 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
