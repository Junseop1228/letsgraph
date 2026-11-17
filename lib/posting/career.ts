// 경력 요건 (specs/posting POST-06): is the posting for new graduates, experienced hires, or either, and how many years.
// Uses what the AI read when the posting was analysed; postings analysed before that are read from their text. Pure.
import type { PostingAnalysisOutput } from "@/lib/contracts/activity";

export type CareerRequirement = { level: "new" | "experienced" | "any" | "unknown"; minYears: number | null };

/** Reads 경력 요건 from the qualification lines and the title ("경력 5년 이상", "경력직", "신입/경력", "경력 무관"...). */
export function careerFromText(lines: string[]): CareerRequirement {
  const text = lines.join(" ").replace(/\s+/g, " ");
  const years = [
    ...text.matchAll(/경력\s*(\d{1,2})\s*년\s*(?:이상|↑|\+)/g),
    ...text.matchAll(/(\d{1,2})\s*년\s*이상\s*(?:의\s*)?(?:경력|실무|업무\s*경험|경험)/g),
    ...text.matchAll(/경력\s*(\d{1,2})\s*~\s*\d{1,2}\s*년/g),
  ].map((m) => Number(m[1]));
  const minYears = years.length ? Math.min(...years) : null;
  if (/경력\s*무관|신입\s*[/·,및]\s*경력|경력\s*[/·,및]\s*신입/.test(text)) return { level: "any", minYears };
  if (minYears || /경력직|경력\s*사원|경력자/.test(text)) return { level: "experienced", minYears };
  if (/신입/.test(text)) return { level: "new", minYears: null };
  return { level: "unknown", minYears: null };
}

export function careerRequirement(a: PostingAnalysisOutput, postingTitle = ""): CareerRequirement {
  if (a.career && a.career.level !== "unknown") return { level: a.career.level, minYears: a.career.minYears };
  return careerFromText([a.title, postingTitle, ...a.qualifications, ...a.preferred.filter((p) => /경력/.test(p))]);
}

/** The warning shown before the user spends quota on this posting, or null when there is nothing to warn about. */
export function careerNotice(r: CareerRequirement): string | null {
  if (r.level !== "experienced") return null;
  return r.minYears
    ? `경력 ${r.minYears}년 이상을 요구하는 공고예요. 신입이면 지원 자격이 안 될 수 있으니, 지원 전에 자격 요건을 먼저 확인해 보세요.`
    : "경력직 공고예요. 신입이면 지원 자격이 안 될 수 있으니, 지원 전에 자격 요건을 먼저 확인해 보세요.";
}
