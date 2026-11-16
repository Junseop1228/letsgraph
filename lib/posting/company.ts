// 공고 회사 맞추기 (specs/posting POST-05): the company name in a posting -> a company in the catalogue. Pure, unit-tested.
import type { Company } from "@/lib/contracts/domain";
import { normalizeCorpName } from "@/lib/dart/parse";

/**
 * Exact name match after normalising ("(주)", "주식회사", spaces, case). Otherwise the longest catalogue name the posting
 * name starts with (e.g. "CJ제일제당 식품사업부문" -> CJ제일제당), at least 2 characters long. No guessing beyond that.
 */
export function matchCompany(companies: Company[], postingCompanyName: string): Company | null {
  const key = normalizeCorpName(postingCompanyName);
  if (!key) return null;
  const exact = companies.find((c) => normalizeCorpName(c.name) === key);
  if (exact) return exact;
  const prefixed = companies
    .map((c) => ({ c, n: normalizeCorpName(c.name) }))
    .filter(({ n }) => n.length >= 2 && key.startsWith(n))
    .sort((a, b) => b.n.length - a.n.length);
  return prefixed[0]?.c ?? null;
}
