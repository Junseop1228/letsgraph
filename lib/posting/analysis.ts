// 공고 정리 결과 판정 (specs/posting FR-POST-01 본문 없음). Pure, so it is unit-tested directly.
import { PostingAnalysisOutput, type PostingAnalysisAiOutput } from "@/lib/contracts/activity";

/**
 * Keeps an AI result only when the input really held a posting: the AI said so and the result has the required parts
 * (at least one duty and one competency). Otherwise returns null and nothing is stored or charged.
 */
export function toPostingAnalysis(ai: PostingAnalysisAiOutput): PostingAnalysisOutput | null {
  const { postingFound, ...rest } = ai;
  if (!postingFound) return null;
  const parsed = PostingAnalysisOutput.safeParse(rest);
  return parsed.success ? parsed.data : null;
}
