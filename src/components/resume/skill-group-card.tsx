import type { ResumeSkillGroup } from '@/lib/resume-types';

export function SkillGroupCard({ group }: { group: ResumeSkillGroup }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-[var(--border)]/60 bg-[var(--surface)]/65 p-5 shadow-sm backdrop-blur-md transition hover:border-[var(--border)] hover:bg-[var(--surface)]/75 hover:shadow-md dark:bg-[var(--surface)]/55">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${group.accent} blur-3xl opacity-70 transition group-hover:scale-110`}
      />
      <h3 className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-700 dark:text-stone-200">
        {group.name}
      </h3>

      <div className="relative mt-3">
        <ul className="flex flex-nowrap gap-2 overflow-x-auto pb-1 pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#000_0%,#000_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_92%,transparent_100%)]">
          {group.items.map((tag) => (
            <li key={tag} className="shrink-0">
              <span className="inline-flex whitespace-nowrap rounded-full border border-[var(--border)]/70 bg-[var(--background)]/70 px-2.5 py-1 text-xs font-medium text-stone-700 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:bg-[var(--background)]/35 dark:text-stone-200">
                {tag}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
