// 공고 ↔ 회사·사업부 잇기 (specs/posting POST-05). A posting the user added gets the catalogue company and, when the
// posting makes it clear, the division its job belongs to. This is what gives 연결 and the Prompt Kit their 사업부 맥락.
// Never blocks the caller: on any failure it returns what it found so far (and logs the reason).
import "server-only";
import type { PostingAnalysisOutput } from "@/lib/contracts/activity";
import { catalog } from "@/lib/data";
import { aiEnabled, pickSegment } from "@/lib/ai/tasks";
import { logAiFailure } from "@/lib/ai/clamp";
import { matchCompany } from "@/lib/posting/company";

export type PostingLink = { companyId: string | null; segmentId: string | null };

export async function linkPosting(analysis: PostingAnalysisOutput): Promise<PostingLink> {
  try {
    const cat = await catalog();
    // the catalogue is searched by the name's first word ("CJ제일제당 식품사업부문" -> "CJ제일제당"), then matched exactly
    const head = analysis.companyName.replace(/\(주\)|㈜|주식회사/g, " ").trim().split(/\s+/)[0] ?? "";
    const candidates = head.length >= 2 ? await cat.searchCompanies(head) : [];
    const company = matchCompany(candidates, analysis.companyName);
    if (!company) return { companyId: null, segmentId: null };
    const segments = await cat.segments(company.id);
    if (segments.length === 1) return { companyId: company.id, segmentId: segments[0].id };
    if (!segments.length || !aiEnabled()) return { companyId: company.id, segmentId: null };
    return { companyId: company.id, segmentId: await pickSegment(analysis, segments) };
  } catch (e) {
    logAiFailure("link_posting", e);
    return { companyId: null, segmentId: null };
  }
}
