export default function ResumeLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-16 lg:px-8">
      <header className="space-y-4">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-14 w-64" />
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-5 w-80 max-w-full" />
        <div className="flex gap-4 pt-2">
          <div className="skeleton h-8 w-40 rounded-full" />
          <div className="skeleton h-8 w-48 rounded-full" />
        </div>
      </header>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border)] p-6 sm:col-span-2">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-3/4" />
        </div>
        <div className="rounded-3xl border border-[var(--border)] p-6">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-10 space-y-4">
        <div className="skeleton h-8 w-24" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-[var(--border)] p-5"
            >
              <div className="skeleton h-4 w-24" />
              <div className="mt-3 flex flex-wrap gap-2">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="skeleton h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
