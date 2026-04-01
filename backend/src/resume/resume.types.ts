/**
 * 个人简历 JSON 结构（与前端 `ResumePayload` 一致；修改时请同步 `src/lib/resume-types.ts`）。
 */
export type ResumeHighlight = {
  value: string;
  label: string;
};

export type ResumeSkillGroup = {
  name: string;
  accent: string;
  items: string[];
};

export type ResumeExperience = {
  company: string;
  role: string;
  period: string;
  location: string;
  /** 简短标签：例如「短期项目」「项目制合同」 */
  badges?: string[];
  points: string[];
};

export type ResumeProject = {
  name: string;
  period: string;
  summary: string;
  stack: string[];
  myRole: string;
  responsibilities: string[];
  outcomes: string[];
};

export type ResumeAiPractice = {
  title: string;
  since: string;
  bullets: string[];
};

export type ResumeEducation = {
  school: string;
  degree: string;
  period: string;
};

export type ResumePayload = {
  name: string;
  englishName: string;
  title: string;
  tagline: string;
  location: string;
  phone?: string;
  email: string;
  yearsExperience: number;
  highlights: ResumeHighlight[];
  summary: string[];
  skillGroups: ResumeSkillGroup[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  aiPractice: ResumeAiPractice;
  education: ResumeEducation[];
};
