"use client";

import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { toast } from "@/lib/toast";
import {
  changelogEntryKey,
  groupChangelogByYear,
  latestApiVersionFromEntries,
  latestWebVersionFromEntries,
  type ChangelogEntry,
  type ChangelogItem,
  type ChangelogKind,
} from "@/lib/changelog";

type KindFilter = "all" | ChangelogKind;
type ScopeFilter = "all" | "web" | "api";

const KIND_ORDER: ChangelogKind[] = [
  "feature",
  "fix",
  "breaking",
  "perf",
  "docs",
];

const KIND_META: Record<
  ChangelogKind,
  { label: string; pill: string; Icon: () => ReactElement }
> = {
  feature: {
    label: "新功能",
    pill: "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100",
    Icon: IconSpark,
  },
  fix: {
    label: "修复",
    pill: "border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100",
    Icon: IconWrench,
  },
  breaking: {
    label: "破坏性变更",
    pill: "border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100",
    Icon: IconAlert,
  },
  perf: {
    label: "性能",
    pill: "border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100",
    Icon: IconBolt,
  },
  docs: {
    label: "文档",
    pill: "border-stone-200/80 bg-stone-100 text-stone-900 dark:border-stone-600/60 dark:bg-stone-800/80 dark:text-stone-100",
    Icon: IconBook,
  },
};

function IconSpark() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.35 6.35a1 1 0 01-3-3l6.35-6.35a6 6 0 017.94-7.94l-3.76 3.76z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBook() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20v-18H6.5A2.5 2.5 0 004 4.5v15zM6.5 2H20v18H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function itemSurfaceLabel(item: ChangelogItem): { text: string; className: string } {
  const s = item.surface ?? "both";
  if (s === "web") {
    return {
      text: "前端",
      className:
        "border-amber-200/90 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    };
  }
  if (s === "api") {
    return {
      text: "后端",
      className:
        "border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100",
    };
  }
  return {
    text: "共通",
    className:
      "border-stone-200/90 bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-800/90 dark:text-stone-400",
  };
}

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

function filterByScope(
  entries: ChangelogEntry[],
  scope: ScopeFilter,
): ChangelogEntry[] {
  if (scope === "all") return entries;
  return entries
    .map((e) => {
      if (scope === "web" && !e.webVersion) return null;
      if (scope === "api" && !e.apiVersion) return null;
      const items = e.items.filter((i) => {
        const s = i.surface ?? "both";
        if (s === "both") return true;
        return scope === "web" ? s === "web" : s === "api";
      });
      return { ...e, items };
    })
    .filter((e): e is ChangelogEntry => e != null && e.items.length > 0);
}

function filterByKind(
  entries: ChangelogEntry[],
  filter: KindFilter,
): ChangelogEntry[] {
  if (filter === "all") return entries;
  return entries
    .map((e) => ({
      ...e,
      items: e.items.filter((i) => i.kind === filter),
    }))
    .filter((e) => e.items.length > 0);
}

function VersionBadge({
  role,
  version,
}: {
  role: "web" | "api";
  version: string;
}) {
  const [done, setDone] = useState(false);
  const surface =
    role === "web"
      ? "border-amber-300/90 bg-amber-50 text-amber-950 ring-amber-500/15 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-50 dark:ring-amber-400/20"
      : "border-violet-300/90 bg-violet-50 text-violet-950 ring-violet-500/15 dark:border-violet-500/35 dark:bg-violet-500/10 dark:text-violet-50 dark:ring-violet-400/20";
  const label = role === "web" ? "前端 Next.js" : "后端 API";

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(version);
          toast.success("版本号已复制");
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className={`group/copy inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium outline-none ring-offset-2 ring-offset-[var(--background)] transition hover:brightness-[0.98] focus-visible:ring-2 dark:ring-offset-[var(--background)] dark:hover:brightness-110 ${surface} ${
        role === "web"
          ? "focus-visible:ring-amber-500/60"
          : "focus-visible:ring-violet-500/60"
      }`}
      aria-label={done ? `${label} 版本号已复制` : `复制${label} 版本号 ${version}`}
    >
      <span className="min-w-0 shrink truncate text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="font-mono tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
        v{version}
      </span>
      <svg
        className="h-3.5 w-3.5 shrink-0 opacity-60 transition group-hover/copy:opacity-100"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M8 7V5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export function ChangelogView({ entries }: { entries: ChangelogEntry[] }) {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  const filtered = useMemo(() => {
    const scoped = filterByScope(entries, scopeFilter);
    return filterByKind(scoped, kindFilter);
  }, [entries, scopeFilter, kindFilter]);

  const yearGroups = useMemo(
    () => groupChangelogByYear(filtered),
    [filtered],
  );

  const totalReleases = entries.length;
  const latestWeb = latestWebVersionFromEntries(entries);
  const latestApi = latestApiVersionFromEntries(entries);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-stone-200/90 dark:border-stone-800/90">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
          aria-hidden
        >
          <div className="absolute -left-1/4 top-0 h-[420px] w-[70%] rounded-full bg-gradient-to-br from-amber-200/50 via-orange-100/30 to-transparent blur-3xl dark:from-amber-500/20 dark:via-orange-500/10" />
          <div className="absolute -right-1/4 bottom-0 h-[320px] w-[60%] rounded-full bg-gradient-to-tl from-stone-300/40 via-transparent to-transparent blur-3xl dark:from-stone-600/20" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-800/90 dark:text-amber-200/90">
            Changelog
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
            版本历史
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600 dark:text-stone-400">
            列表数据持久化在 SQLite 表{" "}
            <code className="rounded bg-stone-100 px-1 text-[0.9em] dark:bg-stone-800">
              changelog_releases
            </code>
            ，经 Nest 接口{" "}
            <code className="rounded bg-stone-100 px-1 text-[0.9em] dark:bg-stone-800">
              GET /api/changelog
            </code>
            提供。可按前端/后端范围与变更类型筛选；点击版本块即可复制对应 semver。
          </p>
          {totalReleases === 0 ? (
            <p
              className="mt-6 max-w-2xl rounded-xl border border-stone-200/90 bg-stone-50/80 px-4 py-3 text-sm leading-relaxed text-stone-700 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300"
              role="status"
            >
              暂无版本记录或无法连接后端。请先启动 API（默认{" "}
              <code className="rounded bg-stone-200/80 px-1 dark:bg-stone-800">
                npm run dev:api
              </code>
              ），并确认数据库已完成迁移与种子数据。
            </p>
          ) : null}
          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-200/80 bg-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/40">
              <dt className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-500">
                累计发布
              </dt>
              <dd className="mt-2 font-serif text-3xl font-semibold tabular-nums text-stone-900 dark:text-stone-50">
                {totalReleases}
              </dd>
            </div>
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-amber-500/20 dark:from-amber-500/10 dark:to-stone-900/40">
              <dt className="text-xs font-medium uppercase tracking-wider text-amber-900/80 dark:text-amber-200/80">
                当前前端版本
              </dt>
              <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums text-amber-950 dark:text-amber-50">
                {latestWeb != null ? `v${latestWeb}` : "—"}
              </dd>
              <dd className="mt-1 text-[11px] leading-snug text-amber-900/70 dark:text-amber-200/70">
                取自最新一条发布的前端 semver
              </dd>
            </div>
            <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-violet-500/20 dark:from-violet-500/10 dark:to-stone-900/40">
              <dt className="text-xs font-medium uppercase tracking-wider text-violet-900/80 dark:text-violet-200/80">
                当前后端版本
              </dt>
              <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums text-violet-950 dark:text-violet-50">
                {latestApi != null ? `v${latestApi}` : "—"}
              </dd>
              <dd className="mt-1 text-[11px] leading-snug text-violet-900/70 dark:text-violet-200/70">
                取自最新一条发布的 API semver
              </dd>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/40 sm:col-span-2 lg:col-span-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-500">
                维护节奏
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                里程碑发布时更新；破坏性变更单独标出。
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="sticky top-14 z-40 border-b border-stone-200/80 bg-[var(--background)]/85 backdrop-blur-md dark:border-stone-800/80">
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-3 sm:px-6">
          <div
            className="flex flex-wrap items-center gap-2"
            role="toolbar"
            aria-label="按前端或后端筛选"
          >
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
              范围
            </span>
            <ScopeChip
              active={scopeFilter === "all"}
              onClick={() => setScopeFilter("all")}
            >
              全部
            </ScopeChip>
            <ScopeChip
              active={scopeFilter === "web"}
              onClick={() => setScopeFilter("web")}
              variant="web"
            >
              仅前端
            </ScopeChip>
            <ScopeChip
              active={scopeFilter === "api"}
              onClick={() => setScopeFilter("api")}
              variant="api"
            >
              仅后端
            </ScopeChip>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 border-t border-stone-100/90 pt-3 dark:border-stone-800/80"
            role="toolbar"
            aria-label="按变更类型筛选"
          >
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
              类型
            </span>
            <FilterChip
              active={kindFilter === "all"}
              onClick={() => setKindFilter("all")}
            >
              全部
            </FilterChip>
            {KIND_ORDER.map((k) => (
              <FilterChip
                key={k}
                active={kindFilter === k}
                onClick={() => setKindFilter(k)}
                accent={KIND_META[k].pill}
              >
                {KIND_META[k].label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {yearGroups.length > 1 ? (
        <div className="border-b border-stone-100/90 dark:border-stone-800/80">
          <div className="mx-auto max-w-4xl px-4 py-2.5 sm:px-6">
            <nav
              className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-500 dark:text-stone-500"
              aria-label="按年份跳转"
            >
              <span className="font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                跳转
              </span>
              {yearGroups.map((g) => (
                <a
                  key={g.year}
                  href={`#year-${g.year}`}
                  className="rounded-full border border-stone-200/90 bg-white/60 px-3 py-1 font-mono text-[13px] tabular-nums text-stone-700 outline-none ring-amber-500/30 transition hover:border-amber-300/90 hover:text-amber-900 focus-visible:ring-2 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200"
                >
                  {g.year}
                </a>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 sm:pt-12">
        {yearGroups.length === 0 ? (
          <p
            className="rounded-2xl border border-dashed border-stone-300/90 px-6 py-16 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400"
            role="status"
          >
            当前筛选下没有条目，请尝试调整「范围」或「类型」。
          </p>
        ) : (
          <div className="space-y-16 sm:space-y-20">
            {yearGroups.map((group) => (
              <section
                key={group.year}
                id={`year-${group.year}`}
                className="scroll-mt-36"
              >
                <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
                  <div className="lg:w-28 lg:shrink-0">
                    <div className="lg:sticky lg:top-32">
                      <p className="font-serif text-3xl font-semibold tabular-nums text-stone-400 dark:text-stone-500">
                        {group.year}
                      </p>
                      <p className="mt-1 text-sm text-stone-500 dark:text-stone-500">
                        {group.entries.length} 次发布
                      </p>
                    </div>
                  </div>

                  <div className="relative min-w-0 flex-1">
                    <div
                      className="pointer-events-none absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-amber-400/70 via-stone-200 to-stone-200 dark:from-amber-500/50 dark:via-stone-700 dark:to-stone-800"
                      aria-hidden
                    />
                    <ul className="relative space-y-8">
                      {group.entries.map((entry) => (
                        <li key={changelogEntryKey(entry)}>
                          <article
                            className="group/card relative pl-10 motion-safe:transition motion-safe:duration-300 motion-safe:ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                            aria-labelledby={`release-${changelogEntryKey(entry)}-title`}
                          >
                            <span
                              className={`absolute left-0 top-7 h-3.5 w-3.5 rounded-full border-2 border-[var(--background)] shadow-[0_0_0_4px] ${
                                entry.webVersion && entry.apiVersion
                                  ? "bg-gradient-to-br from-amber-400 to-violet-500 shadow-amber-500/15 dark:from-amber-300 dark:to-violet-500 dark:shadow-violet-500/15"
                                  : entry.webVersion
                                    ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/15 dark:from-amber-300 dark:to-amber-600"
                                    : "bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/15 dark:from-violet-300 dark:to-violet-600"
                              }`}
                              aria-hidden
                            />

                            <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white/80 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm motion-safe:transition motion-safe:duration-300 group-hover/card:border-stone-300/90 group-hover/card:shadow-md group-hover/card:ring-black/[0.05] dark:border-stone-700/90 dark:bg-stone-900/50 dark:ring-white/[0.04] dark:group-hover/card:border-stone-600 dark:group-hover/card:shadow-lg dark:group-hover/card:ring-white/[0.07]">
                              <div className="flex flex-col gap-4 border-b border-stone-100/90 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-stone-800/90">
                                <div className="min-w-0 space-y-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {entry.webVersion ? (
                                        <VersionBadge
                                          role="web"
                                          version={entry.webVersion}
                                        />
                                      ) : null}
                                      {entry.apiVersion ? (
                                        <VersionBadge
                                          role="api"
                                          version={entry.apiVersion}
                                        />
                                      ) : null}
                                    </div>
                                    <time
                                      dateTime={entry.date}
                                      className="text-sm text-stone-500 dark:text-stone-400"
                                    >
                                      {formatDate(entry.date)}
                                    </time>
                                  </div>
                                  {entry.title ? (
                                    <h2
                                      id={`release-${changelogEntryKey(entry)}-title`}
                                      className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
                                    >
                                      {entry.title}
                                    </h2>
                                  ) : (
                                    <h2
                                      id={`release-${changelogEntryKey(entry)}-title`}
                                      className="sr-only"
                                    >
                                      发布{" "}
                                      {entry.webVersion
                                        ? `前端 ${entry.webVersion}`
                                        : ""}
                                      {entry.webVersion && entry.apiVersion ? "，" : ""}
                                      {entry.apiVersion
                                        ? `后端 ${entry.apiVersion}`
                                        : ""}
                                    </h2>
                                  )}
                                </div>
                              </div>

                              <ul className="divide-y divide-stone-100 dark:divide-stone-800/90">
                                {entry.items.map((item, idx) => {
                                  const meta = KIND_META[item.kind];
                                  const Icon = meta.Icon;
                                  const surf = itemSurfaceLabel(item);
                                  return (
                                    <li key={idx}>
                                      <div className="flex gap-4 px-5 py-4 sm:px-6">
                                        <div className="flex shrink-0 flex-col items-center gap-2">
                                          <span
                                            className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${surf.className}`}
                                          >
                                            {surf.text}
                                          </span>
                                          <span
                                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-stone-700 dark:text-stone-200 ${meta.pill}`}
                                            title={meta.label}
                                          >
                                            <Icon />
                                          </span>
                                        </div>
                                        <p className="min-w-0 flex-1 pt-0.5 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                                          {item.text}
                                        </p>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </article>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScopeChip({
  children,
  active,
  onClick,
  variant,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: "web" | "api";
}) {
  const activeWeb =
    "border-amber-400/90 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-50";
  const activeApi =
    "border-violet-400/90 bg-violet-50 text-violet-950 shadow-sm dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] dark:focus-visible:ring-offset-[var(--background)]",
        active
          ? variant === "web"
            ? `${activeWeb} focus-visible:ring-amber-500/50`
            : variant === "api"
              ? `${activeApi} focus-visible:ring-violet-500/50`
              : "border-stone-900 bg-stone-900 text-white shadow-sm focus-visible:ring-stone-500/50 dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950 dark:focus-visible:ring-amber-400/60"
          : "border-stone-200/90 bg-white/70 text-stone-600 hover:border-stone-300 hover:bg-stone-50 focus-visible:ring-amber-500/40 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800/80",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  accent,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] dark:focus-visible:ring-offset-[var(--background)]",
        active
          ? accent
            ? `${accent} border-transparent shadow-sm`
            : "border-stone-900 bg-stone-900 text-white shadow-sm dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950"
          : "border-stone-200/90 bg-white/70 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800/80",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
