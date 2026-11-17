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
/**
 * 지원서 문항 유형 (specs/prompt-kit FR-PREM-04). The first four match episode themes; 성과·강점 and 경력기술서 come from
 * real application forms (e.g. "직장 경험 중 가장 큰 성과", "경력기술서: 회사명, 재직기간, ..."); other = free structure.
 */
export const QuestionType = z.enum(["problem", "collab", "growth", "motive", "achievement", "career", "other"]);
export type QuestionType = z.infer<typeof QuestionType>;
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  problem: "직무 역량",
  collab: "협업·갈등",
  growth: "성장과정·가치관",
  motive: "지원동기·입사 후 포부",
  achievement: "성과·강점",
  career: "경력기술서",
  other: "기타",
};
/** 지원서 문항: the question as written, its character limits, and its type. */
export const EssayQuestion = z.object({
  id: z.string(),
  text: z.string().min(1).max(1000),
  maxChars: z.number().int().positive().max(20000).nullable(),
  minChars: z.number().int().nonnegative().max(20000).nullable(),
  type: QuestionType,
  /**
   * 문항 ↔ 에피소드 (FR-PREM-05): episodes matched to this question by content (AI read all questions and episodes),
   * or chosen by the user (manual). Absent = not matched yet (theme rule applies); [] = nothing fits.
   */
  episodeIds: z.array(z.string()).max(2).optional(),
  fit: z.string().max(200).optional(), // why the episode answers this question
  need: z.string().max(150).optional(), // the scene that would answer it, when nothing fits
  manual: z.boolean().optional(),
  basis: z.string().max(40).optional(), // fingerprint of the episodes the matching read
});
export type EssayQuestion = z.infer<typeof EssayQuestion>;
/** What the AI returns when it matches questions and episodes (trimmed in lib/kit/questions.ts applyMatches). */
export const QuestionMatchAiOutput = z.object({
  matches: z.array(z.object({ questionId: z.string(), episodeIds: z.array(z.string()), why: z.string(), need: z.string().nullable() })),
});
/** What the AI reads from a pasted application form (no limits; trimmed in lib/kit/questions.ts). */
export const EssayQuestionsAiOutput = z.object({
  questions: z.array(z.object({ text: z.string(), maxChars: z.number().nullable(), minChars: z.number().nullable(), type: QuestionType })),
});

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
  source: z.enum(["upload", "url", "demo"]), // upload = 사용자가 올린 PDF·붙여넣은 내용, url = 사용자가 넣은 공고 주소에서 가져옴 (specs/posting POST-03)
  sourceUrl: z.string().optional(),
  questions: z.array(EssayQuestion).max(10).optional(), // 지원서 문항 (FR-PREM-04)
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
  /** 경력 요건 (specs/posting POST-06). Absent in analyses made before 2026-11-17 (read from the text instead). */
  career: z.object({ level: z.enum(["new", "experienced", "any", "unknown"]), minYears: z.number().int().min(0).max(30).nullable() }).optional(),
  /** 직무 (POST-07): one of lib/reference/jobs.ts, or null when the posting does not make it clear */
  jobRoleId: z.string().max(60).nullable().optional(),
});
export type PostingAnalysisOutput = z.infer<typeof PostingAnalysisOutput>;
export type Competency = z.infer<typeof Competency>;

/**
 * What the AI returns for 공고 정리: the analysis plus whether the input really contained a posting body.
 * Pages that load the posting with JavaScript give only menus and site-wide notices (specs/posting FR-POST-01 본문 없음).
 * Lists may be empty here; lib/posting/analysis.ts turns this into a PostingAnalysisOutput or "no posting".
 */
export const PostingAnalysisAiOutput = PostingAnalysisOutput.extend({
  postingFound: z.boolean(),
  duties: z.array(z.string()).max(8),
  competencies: z.array(Competency).max(8),
});
export type PostingAnalysisAiOutput = z.infer<typeof PostingAnalysisAiOutput>;

/** 공고 내용 붙여넣기 (specs/posting POST-04) */
export const PostingTextInput = z
  .string({ error: "공고 내용을 붙여넣어 주세요." })
  .trim()
  .min(100, "공고 내용이 너무 짧아요. 업무와 자격 요건이 들어간 부분까지 붙여넣어 주세요.")
  .max(20_000, "2만 자까지 붙여넣을 수 있어요. 공고 본문만 남겨 주세요.");

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
/** 에피소드 테마: which kind of 자소서 question an episode serves (specs/portfolio PORT-04). */
export const EpisodeTheme = z.enum(["problem", "collab", "growth", "motive"]);
export type EpisodeTheme = z.infer<typeof EpisodeTheme>;
export const EPISODE_THEME_LABEL: Record<EpisodeTheme, string> = {
  problem: "문제 해결·직무 역량",
  collab: "협업·갈등",
  growth: "성장·가치관",
  motive: "직무 관심 계기",
};

/**
 * 에피소드 (stored in `experiences`): one scene from an activity, in STAR order (specs/portfolio PORT-03).
 * role (T, 내가 맡은 일) and learning (배운 점) are optional: cards made before activities existed have neither.
 */
export const ExperienceOutput = z.object({
  title: z.string().min(1).max(40),
  kind: ExperienceKind,
  theme: EpisodeTheme.optional(),
  period: z.string().optional(),
  situation: z.string().max(300),
  role: z.string().max(200).optional(),
  action: z.string().max(400),
  result: z.string().max(300),
  learning: z.string().max(300).optional(),
  competencies: z.array(z.string()).max(5),
});
export type ExperienceOutput = z.infer<typeof ExperienceOutput>;
/** One turn of the 경험 대화, kept with the episode it made (specs/portfolio PORT-02 대화 기록). */
export const ChatTurnSchema = z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) });
export const ChatLog = z.array(ChatTurnSchema).max(40);
export const Experience = ExperienceOutput.extend({ id: z.string(), sourceLabel: z.string().optional(), activityId: z.string().optional(), chatLog: ChatLog.optional() });
export type Experience = z.infer<typeof Experience>;

/** 장면 후보: a moment in an activity worth turning into an episode, with what the source (PDF) says about it. */
export const ActivityScene = z.object({ title: z.string().min(1).max(40), hint: z.string().max(200) });
export type ActivityScene = z.infer<typeof ActivityScene>;

/**
 * 활동: a project, club, internship, part-time job... that episodes are taken from (specs/portfolio PORT-03).
 * scenes are kept because the original PDF is not stored: they are the material episodes are drawn from later.
 */
export const ActivityOutput = z.object({
  title: z.string().min(1).max(40),
  kind: ExperienceKind,
  period: z.string().max(40).optional(),
  role: z.string().max(200).optional(),
  /** 사용한 데이터: name, size, source in one line (e.g. "MNIST 손글씨 이미지 7만 장, 공개 데이터"). Empty if none. */
  dataset: z.string().max(200).optional(),
  summary: z.string().max(800),
  scenes: z.array(ActivityScene).max(5).optional(),
});
export type ActivityOutput = z.infer<typeof ActivityOutput>;
export const Activity = ActivityOutput.extend({ id: z.string(), sourceLabel: z.string().optional() });
export type Activity = z.infer<typeof Activity>;

/** 추천 에피소드 (PORT-04): a theme and a scene the activity can give, with why it fits that theme. */
export const EpisodeSuggestion = z.object({ theme: EpisodeTheme, title: z.string().min(1).max(40), why: z.string().max(120) });
export type EpisodeSuggestion = z.infer<typeof EpisodeSuggestion>;
export const EpisodeSuggestionOutput = z.object({ suggestions: z.array(EpisodeSuggestion).max(4) });

/**
 * AI-side shapes without length limits. A result that is a little too long is trimmed to the contracts above
 * (lib/ai/clamp.ts) instead of being thrown away; nothing is added, only cut.
 */
const LooseScene = z.object({ title: z.string(), hint: z.string() });
export const ActivityAiOutput = z.object({
  title: z.string(), kind: ExperienceKind, period: z.string().optional(), role: z.string().optional(), dataset: z.string().optional(), summary: z.string(),
  scenes: z.array(LooseScene).optional(),
});
export const ActivityExtractionAiOutput = z.object({ activities: z.array(ActivityAiOutput) });
export const EpisodeAiOutput = z.object({
  title: z.string(), kind: ExperienceKind, theme: EpisodeTheme.optional(), period: z.string().optional(),
  situation: z.string(), role: z.string().optional(), action: z.string(), result: z.string(), learning: z.string().optional(),
  competencies: z.array(z.string()),
});
export const EpisodeSuggestionAiOutput = z.object({ suggestions: z.array(z.object({ theme: EpisodeTheme, title: z.string(), why: z.string() })) });
/** 코치의 다음 말 (PORT-04 테마 바꾸기 제안): the reply, and a theme the answers so far clearly fit better, if any. */
export const ChatReplyAiOutput = z.object({ reply: z.string(), betterTheme: EpisodeTheme.nullable() });
/** PDF -> activity cards (specs/portfolio FR-PREM-01). Episodes are taken out later in the chat (PORT-02). */
export const ActivityExtractionOutput = z.object({ activities: z.array(ActivityOutput).max(6) });

/** 연결 지점 ConnectionPoint — AI output */
export const ConnectionPoint = z.object({
  competency: z.string(),
  experienceId: z.string().optional(), // the episode (links made before ids existed have only the title)
  experienceTitle: z.string(),
  reason: z.string().max(300), // why this experience shows this competency
  context: z.string().max(200).optional(), // segment / business context used
});
/**
 * 지원 근거 (specs/connection FR-PREM-02, 2026-11-17): one condition of the posting (핵심 역량, 자격 요건 or 우대 사항)
 * with the activity or episode that best proves it, how strongly, what is missing and what to do next.
 */
export const RequirementKind = z.enum(["competency", "qualification", "preferred"]);
export type RequirementKind = z.infer<typeof RequirementKind>;
export const REQUIREMENT_KIND_LABEL: Record<RequirementKind, string> = { competency: "핵심 역량", qualification: "자격 요건", preferred: "우대 사항" };
export const EvidenceStrength = z.enum(["strong", "medium", "weak", "none"]);
export type EvidenceStrength = z.infer<typeof EvidenceStrength>;
export const STRENGTH_LABEL: Record<EvidenceStrength, string> = { strong: "근거 강함", medium: "근거 보통", weak: "근거 약함", none: "근거 없음" };
export const EvidencePoint = z.object({
  requirement: z.string().min(1).max(200),
  kind: RequirementKind,
  cardType: z.enum(["activity", "episode", "none"]),
  cardId: z.string().optional(),
  cardTitle: z.string().max(80).optional(),
  strength: EvidenceStrength,
  reason: z.string().max(300),
  missing: z.string().max(200).optional(), // what the card does not show
  next: z.string().max(150).optional(), // what to do (a scene to take out in 만들기, or check the requirement)
});
export type EvidencePoint = z.infer<typeof EvidencePoint>;
/** What the AI returns (no limits; trimmed in lib/connect/evidence.ts). */
export const EvidenceAiOutput = z.object({
  evidence: z.array(
    z.object({
      requirement: z.string(),
      kind: RequirementKind,
      cardType: z.enum(["activity", "episode", "none"]),
      cardId: z.string().nullable(),
      strength: EvidenceStrength,
      reason: z.string(),
      missing: z.string().nullable(),
      next: z.string().nullable(),
    }),
  ),
});

/** 전문성 연결: a job-skill competency (can the applicant do it?) proven by a whole activity. */
export const SkillPoint = z.object({
  competency: z.string(),
  activityId: z.string().optional(),
  activityTitle: z.string(),
  reason: z.string().max(300), // from the activity's summary, data, role and period
});
export type SkillPoint = z.infer<typeof SkillPoint>;
export const ConnectionOutput = z.object({
  links: z.array(ConnectionPoint).max(12), // 행동 역량 ↔ 에피소드 (how did they do it?)
  skills: z.array(SkillPoint).max(8).optional(), // 직무 전문성 ↔ 활동; absent in results made before 2026-11-16
  basis: z.string().max(40).optional(), // fingerprint of the cards it was made from (lib/connect/freshness.ts)
  /** 지원 근거 for every condition; links, skills and gaps are derived from it for the competencies. */
  evidence: z.array(EvidencePoint).max(24).optional(),
  gaps: z.array(z.string()).max(8), // competencies with no activity or episode yet
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
