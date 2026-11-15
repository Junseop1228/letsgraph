// User-activity contracts (specs/posting, specs/portfolio, specs/connection, specs/prompt-kit).
// The *Output schemas are also the AI output schemas: every AI result is parsed with them before it is stored or shown.
import { z } from "zod";

export const PostingStatus = z.enum(["interested", "applied", "interview", "passed", "rejected"]);
export type PostingStatus = z.infer<typeof PostingStatus>;
export const POSTING_STATUS_LABEL: Record<PostingStatus, string> = {
  interested: "관심",
  applied: "지원",
  interview: "면접",
  passed: "합격",
  rejected: "불합격",
};

/** 채용공고 JobPosting (uploaded by the user; demo rows are marked) */
export const JobPosting = z.object({
  id: z.string(),
  companyId: z.string().optional(),
  companyName: z.string(),
  segmentId: z.string().optional(),
  title: z.string(),
  jobRoleId: z.string().optional(),
  deadline: z.string().nullable(), // ISO date, null = 상시/채용 시 마감
  deadlineNote: z.string().optional(),
  status: PostingStatus,
  source: z.enum(["upload", "url", "demo"]), // url = 사용자가 넣은 공고 주소에서 가져옴 (specs/posting POST-03)
  sourceUrl: z.string().optional(),
});
export type JobPosting = z.infer<typeof JobPosting>;

/** 공고 주소 입력 (specs/posting POST-03). Safety checks (public http/https only) run in lib/posting/url.ts. */
export const PostingUrlInput = z
  .string({ error: "공고 주소를 넣어 주세요." })
  .trim()
  .min(1, "공고 주소를 넣어 주세요.")
  .max(2048, "주소가 너무 길어요.");

/** 공고 정리 PostingAnalysis — AI output */
export const Competency = z.object({
  name: z.string().min(1).max(20),
  basis: z.enum(["stated", "inferred"]), // 공고 명시 / 업무상 추론
  evidence: z.string().max(200),
});
export const PostingAnalysisOutput = z.object({
  companyName: z.string(),
  title: z.string(),
  deadline: z.string().nullable(),
  duties: z.array(z.string()).min(1).max(8),
  qualifications: z.array(z.string()).max(8),
  preferred: z.array(z.string()).max(8),
  competencies: z.array(Competency).min(1).max(8),
  cautions: z.array(z.string()).max(5), // 작성 주의사항 (e.g. 희망 근무지 기재)
});
export type PostingAnalysisOutput = z.infer<typeof PostingAnalysisOutput>;
export type Competency = z.infer<typeof Competency>;

/** 경험 Experience (경험 카드) — AI output when extracted from an upload */
export const ExperienceKind = z.enum(["contest", "club", "parttime", "course", "intern", "project", "other"]);
export const EXPERIENCE_KIND_LABEL: Record<z.infer<typeof ExperienceKind>, string> = {
  contest: "공모전",
  club: "동아리",
  parttime: "알바",
  course: "수업",
  intern: "인턴",
  project: "프로젝트",
  other: "기타",
};
export const ExperienceOutput = z.object({
  title: z.string().min(1).max(40),
  kind: ExperienceKind,
  period: z.string().optional(),
  situation: z.string().max(300),
  action: z.string().max(400),
  result: z.string().max(300),
  competencies: z.array(z.string()).max(5),
});
export const Experience = ExperienceOutput.extend({ id: z.string(), sourceLabel: z.string().optional() });
export type Experience = z.infer<typeof Experience>;
export const ExperienceExtractionOutput = z.object({ experiences: z.array(ExperienceOutput).max(12) });

/** 연결 지점 ConnectionPoint — AI output */
export const ConnectionPoint = z.object({
  competency: z.string(),
  experienceTitle: z.string(),
  reason: z.string().max(300), // why this experience shows this competency
  context: z.string().max(200).optional(), // segment / business context used
});
export const ConnectionOutput = z.object({
  links: z.array(ConnectionPoint).max(12),
  gaps: z.array(z.string()).max(8), // competencies with no experience yet
});
export type ConnectionOutput = z.infer<typeof ConnectionOutput>;

/** 프롬프트 키트 PromptKit */
export const PromptKitSection = z.object({ id: z.string(), title: z.string(), body: z.string() });
export const PromptKit = z.object({
  id: z.string(),
  postingId: z.string(),
  title: z.string(),
  createdAt: z.string(),
  sections: z.array(PromptKitSection),
});
export type PromptKit = z.infer<typeof PromptKit>;
