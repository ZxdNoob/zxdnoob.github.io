export default function ChangelogLoading() {
  return (
    <main className="min-h-[60vh]">
      <section className="border-b border-stone-200/90 dark:border-stone-800/90">
        <div className="mx-auto max-w-4xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-4 h-12 w-48" />
          <div className="skeleton mt-4 h-5 w-96 max-w-full" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--border)] p-5"
              >
                <div className="skeleton h-3 w-16" />
                <div className="skeleton mt-3 h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border)] p-6"
            >
              <div className="flex gap-3">
                <div className="skeleton h-7 w-28 rounded-lg" />
                <div className="skeleton h-7 w-28 rounded-lg" />
              </div>
              <div className="skeleton mt-4 h-6 w-48" />
              <div className="mt-4 space-y-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
