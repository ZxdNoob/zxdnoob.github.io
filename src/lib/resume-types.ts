/**
 * 个人简历 JSON 结构（与 Nest `GET /api/resume` 返回一致）。
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
  /** 联系电话（`tel:`）；旧数据可缺省 */
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
