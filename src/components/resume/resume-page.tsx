import Link from 'next/link';
import { ExperienceSection } from '@/components/resume/experience-section';
import { SkillGroupCard } from '@/components/resume/skill-group-card';
import { ResumeProjectCard } from '@/components/resume/resume-project-card';
import type { ResumePayload } from '@/lib/resume-types';

const toc = [
  { id: 'overview', label: '概览' },
  { id: 'skills', label: '技术栈' },
  { id: 'experience', label: '经历' },
  { id: 'projects', label: '项目' },
  { id: 'ai', label: 'AI 实践' },
  { id: 'education', label: '教育' },
] as const;

function formatCnMobileDisplay(phone: string): string {
  const d = phone.replace(/\s/g, '');
  if (d.length === 11) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  return phone;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
      {children}
    </p>
  );
}

export function ResumePage({ resume }: { resume: ResumePayload | null }) {
  if (!resume) {
    return (
      <main className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            暂时无法加载简历数据。请先启动 API（默认{' '}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
              npm run dev:api
            </code>
            ）并配置{' '}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
              API_URL
            </code>
            或{' '}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
              NEXT_PUBLIC_API_URL
            </code>
            。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-1/3 -left-1/4 h-[min(90vw,720px)] w-[min(90vw,720px)] rounded-full bg-amber-200/35 blur-[100px] dark:bg-amber-900/25" />
        <div className="absolute top-1/3 -right-1/4 h-[min(80vw,560px)] w-[min(80vw,560px)] rounded-full bg-orange-200/25 blur-[90px] dark:bg-orange-950/30" />
        <div className="absolute bottom-0 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-80" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-16 lg:px-8 lg:pb-32">
        {/* Hero */}
        <header className="animate-in relative">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p
                className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400"
                style={{ animationDelay: '40ms' }}
              >
                Resume · 个人简历
              </p>
              <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl dark:text-stone-50">
                {resume.name}
                <span className="mt-2 block text-2xl font-medium text-stone-600 sm:text-3xl dark:text-stone-400">
                  {resume.englishName}
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600 dark:text-stone-400">
                {resume.title}
                <span className="mx-2 text-stone-300 dark:text-stone-600">
                  ·
                </span>
                {resume.location}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {resume.phone ? (
                  <a
                    href={`tel:${resume.phone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 text-stone-700 transition hover:text-[var(--accent)] dark:text-stone-300 dark:hover:text-[var(--accent)]"
                  >
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                      aria-hidden
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <span className="tabular-nums">
                      {formatCnMobileDisplay(resume.phone)}
                    </span>
                  </a>
                ) : null}
                <a
                  href={`mailto:${resume.email}`}
                  className="inline-flex min-w-0 items-center gap-2 text-stone-700 transition hover:text-[var(--accent)] dark:text-stone-300 dark:hover:text-[var(--accent)]"
                >
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                    aria-hidden
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <span className="break-all">{resume.email}</span>
                </a>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
              <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 px-5 py-4 shadow-sm backdrop-blur-md dark:bg-[var(--surface)]/50">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/30 to-transparent" />
                <p className="relative text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  一线经验
                </p>
                <p className="relative mt-1 font-serif text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
                  {resume.yearsExperience}+
                  <span className="ml-1 text-base font-semibold text-[var(--accent)]">
                    年
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Highlight chips */}
          <ul className="mt-10 flex flex-wrap gap-2">
            {resume.highlights.map((h, i) => (
              <li
                key={h.label}
                className="animate-in rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-2 text-sm shadow-sm backdrop-blur-sm dark:bg-[var(--surface)]/40"
                style={{ animationDelay: `${80 + i * 50}ms` }}
              >
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {h.value}
                </span>
                <span className="ml-2 text-stone-500 dark:text-stone-400">
                  {h.label}
                </span>
              </li>
            ))}
          </ul>
        </header>

        {/* Mobile TOC */}
        <nav
          className="animate-in mt-10 flex gap-2 overflow-x-auto pb-1 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ animationDelay: '120ms' }}
          aria-label="页面章节"
        >
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-[var(--accent)] hover:text-[var(--accent)] dark:text-stone-400"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr),200px] lg:gap-12 xl:grid-cols-[minmax(0,1fr),220px]">
          {/* Bento + sections */}
          <div className="min-w-0 space-y-10">
            {/* Bento grid */}
            <section
              id="overview"
              className="scroll-mt-28"
              aria-labelledby="overview-heading"
            >
              <h2 id="overview-heading" className="sr-only">
                概览
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-stone-50/80 p-6 shadow-sm transition hover:shadow-md dark:from-[var(--surface)] dark:to-stone-900/40 sm:col-span-2 lg:col-span-2">
                  <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent opacity-80 transition group-hover:scale-110" />
                  <SectionLabel>个人摘要</SectionLabel>
                  <div className="relative space-y-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    {resume.summary.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-6 shadow-sm dark:bg-[var(--surface)]/70">
                  <div
                    className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' fill='none' stroke='%2378716c' stroke-width='1'/%3E%3C/svg%3E")`,
                    }}
                  />
                  <div className="relative">
                    <SectionLabel>页面导览</SectionLabel>
                    <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                      通过页面目录直达各章节（桌面 ON THIS PAGE /
                      移动顶部）；页面整体内容为招聘与合作场景精简整理，便于快速浏览核心能力。
                    </p>
                    <Link
                      href="/blog"
                      className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--accent)] hover:underline"
                    >
                      阅读技术文章
                      <span className="ml-1" aria-hidden>
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Skills */}
            <section
              id="skills"
              className="scroll-mt-28"
              aria-labelledby="skills-heading"
            >
              <h2
                id="skills-heading"
                className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
              >
                技术栈
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
                按能力域分组，覆盖业务交付、跨端适配与工程化体系建设；主栈聚焦{' '}
                <strong className="font-semibold text-stone-800 dark:text-stone-200">
                  React + TypeScript
                </strong>
                。
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {resume.skillGroups.map((g) => (
                  <SkillGroupCard key={g.name} group={g} />
                ))}
              </div>
            </section>

            {/* Experience */}
            <section
              id="experience"
              className="scroll-mt-28"
              aria-labelledby="experience-heading"
            >
              <h2
                id="experience-heading"
                className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
              >
                工作经历
              </h2>
              <ExperienceSection
                experience={resume.experience}
                defaultVisible={3}
              />
            </section>

            {/* Projects */}
            <section
              id="projects"
              className="scroll-mt-28"
              aria-labelledby="projects-heading"
            >
              <h2
                id="projects-heading"
                className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
              >
                代表项目
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-stone-600 dark:text-stone-400">
                以下为参与项目中的职责、成果与个人贡献说明。
              </p>
              <div className="mt-8 space-y-8">
                {resume.projects.map((proj) => (
                  <ResumeProjectCard key={proj.name} project={proj} />
                ))}
              </div>
            </section>

            {/* AI + Education row */}
            <div className="grid gap-4 lg:grid-cols-2">
              <section
                id="ai"
                className="scroll-mt-28 rounded-3xl border border-dashed border-amber-400/50 bg-gradient-to-br from-amber-50/80 to-transparent p-6 dark:from-amber-950/30 dark:to-transparent"
                aria-labelledby="ai-heading"
              >
                <h2
                  id="ai-heading"
                  className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100"
                >
                  {resume.aiPractice.title}
                  <span className="ml-2 text-sm font-normal text-stone-500 dark:text-stone-400">
                    · {resume.aiPractice.since}
                  </span>
                </h2>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {resume.aiPractice.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="text-[var(--accent)]" aria-hidden>
                        ✦
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                id="education"
                className="scroll-mt-28 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 dark:bg-[var(--surface)]/60"
                aria-labelledby="education-heading"
              >
                <h2
                  id="education-heading"
                  className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100"
                >
                  教育背景
                </h2>
                <ul className="mt-4 space-y-4">
                  {resume.education.map((edu) => (
                    <li key={edu.school}>
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {edu.school}
                      </p>
                      <p className="text-sm text-stone-600 dark:text-stone-400">
                        {edu.degree}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-stone-500">
                        {edu.period}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          {/* Desktop TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6">
              <nav
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-4 shadow-sm backdrop-blur-md dark:bg-[var(--surface)]/50"
                aria-label="章节导航"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  On this page
                </p>
                <ul className="mt-3 space-y-1">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-lg px-2 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-[var(--accent)] dark:text-stone-400 dark:hover:bg-stone-800/80"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="rounded-2xl border border-[var(--border)] bg-stone-900 p-4 text-stone-100 dark:border-stone-700 dark:bg-stone-950">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  提示
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-300">
                  本页为在线简历展示；投递纸质版或 PDF 时请以最新版本为准。
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
