/**
 * 在线简历路由：构建期 `fetchResume()` 拉取 `GET /api/resume`，失败时由 `ResumePage` 展示空态。
 */
import type { Metadata } from 'next';
import { ResumePage } from '@/components/resume/resume-page';
import { fetchResume } from '@/lib/resume';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: '个人简历',
  description:
    '前端工程师个人简历：React、TypeScript、跨端小程序与工程化实践概览。',
  openGraph: {
    title: `个人简历 · ${site.name}`,
    description:
      '8 年一线前端经验，主栈 React + TypeScript，含 Taro / 小程序与 AI 辅助开发实践。',
  },
};

export default async function ResumeRoutePage() {
  const resume = await fetchResume();
  return <ResumePage resume={resume} />;
}
