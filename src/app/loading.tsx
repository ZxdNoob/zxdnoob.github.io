export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Title skeleton */}
        <div className="space-y-3">
          <div className="skeleton h-10 w-64" />
          <div className="skeleton h-5 w-96 max-w-full" />
        </div>
        {/* Card skeletons */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-[var(--border)] p-6"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="skeleton h-4 w-20" />
              <div className="skeleton mt-4 h-6 w-3/4" />
              <div className="skeleton mt-3 h-4 w-full" />
              <div className="skeleton mt-2 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
