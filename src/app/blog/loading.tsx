export default function BlogLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <header className="border-b border-[var(--border)]/60 pb-10">
        <div className="skeleton h-12 w-32" />
        <div className="skeleton mt-4 h-5 w-80 max-w-full" />
      </header>
      <div className="mt-10 grid gap-4 lg:grid-cols-[16rem,minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="rounded-3xl border border-[var(--border)] p-4 space-y-4">
            <div className="skeleton h-4 w-12" />
            <div className="skeleton h-10 w-full rounded-2xl" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-10 w-full rounded-2xl" />
            <div className="flex gap-2">
              <div className="skeleton h-7 w-14 rounded-full" />
              <div className="skeleton h-7 w-14 rounded-full" />
            </div>
          </div>
        </aside>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-[var(--border)]/50 p-5"
            >
              <div className="flex gap-3">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-3 w-20" />
              </div>
              <div className="skeleton mt-3 h-6 w-3/4" />
              <div className="skeleton mt-2 h-4 w-full" />
              <div className="skeleton mt-1 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
