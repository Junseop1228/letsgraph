// 사업보고서 원문 (OpenDART 공시서류원본파일 document.xml) -> "II. 사업의 내용" text for the B1/B2 extraction
// (specs/data-pipeline FR-OPS-03). Pure, unit-tested; the download is DartClient.document().
import { strFromU8, unzipSync } from "fflate";

/** The main XML of a filing zip: "<rcept_no>.xml", else the largest entry (attachments are "<rcept_no>_<n>.xml"). */
export function mainDocument(zip: Uint8Array, rceptNo: string): string {
  const files = unzipSync(zip);
  const entries = Object.entries(files);
  if (!entries.length) throw new Error("empty filing zip");
  const main = files[`${rceptNo}.xml`] ?? entries.sort((a, b) => b[1].length - a[1].length)[0][1];
  return decodeXml(main);
}

/** UTF-8 by default; older filings declare EUC-KR. */
export function decodeXml(bytes: Uint8Array): string {
  const head = strFromU8(bytes.slice(0, 200));
  if (/encoding=["'](euc-kr|ks_c_5601-1987|cp949)["']/i.test(head)) return new TextDecoder("euc-kr").decode(bytes);
  return strFromU8(bytes);
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ", "&#160;": " " };

/** Markup -> plain text. Tables become one line per row with " | " between cells. */
export function xmlToText(fragment: string): string {
  const tables = fragment.replace(/<TABLE[\s\S]*?<\/TABLE>/gi, (t) =>
    "\n" +
    t
      .replace(/<\/(TD|TE|TH|TU)>/gi, " | ")
      .replace(/<\/TR>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t\r]+/g, " ")
      .replace(/ \| \n/g, "\n")
      .replace(/\n /g, "\n") +
    "\n",
  );
  return tables
    .replace(/<(P|BR|TITLE|SECTION-\d)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/[ \t\r]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export type Part = { title: string; text: string };

/**
 * "II. 사업의 내용" split into its numbered parts (1. 사업의 개요, 2. 주요 제품 및 서비스, ...).
 * Returns [] when the filing has no such chapter (e.g. some funds and SPACs).
 */
export function businessParts(xml: string): Part[] {
  const start = xml.search(/<TITLE[^>]*>\s*II\s*\.\s*사업의\s*내용/);
  if (start < 0) return [];
  const rest = xml.slice(start);
  const end = rest.slice(10).search(/<TITLE[^>]*>\s*III\s*\./);
  const chapter = end < 0 ? rest : rest.slice(0, end + 10);
  const titles = [...chapter.matchAll(/<TITLE[^>]*>([\s\S]*?)<\/TITLE>/g)];
  const parts: Part[] = [];
  for (let i = 1; i < titles.length; i++) {
    const from = titles[i].index! + titles[i][0].length;
    const to = i + 1 < titles.length ? titles[i + 1].index! : chapter.length;
    parts.push({ title: xmlToText(titles[i][1]), text: xmlToText(chapter.slice(from, to)) });
  }
  // a chapter written without sub-titles
  if (!parts.length) parts.push({ title: "사업의 내용", text: xmlToText(chapter.slice(titles[0][0].length + (titles[0].index ?? 0))) });
  return parts.filter((p) => p.text.length > 0);
}

/** Parts that tell how a company makes money come first; the rest only while room is left. */
const PRIORITY = [/개요/, /제품|서비스/, /매출|수주/, /원재료|생산/, /연구개발|주요계약/, /기타/];

/**
 * The text sent to the model, at most maxChars (token budget, D 2026-11-17 20:02). Parts keep their original order;
 * a part that does not fit whole is cut and marked.
 */
export function promptText(parts: Part[], maxChars: number): string {
  const rank = (t: string) => {
    const k = PRIORITY.findIndex((r) => r.test(t));
    return k < 0 ? PRIORITY.length : k;
  };
  const order = parts.map((p, i) => ({ p, i, r: rank(p.title) })).sort((a, b) => a.r - b.r || a.i - b.i);
  const keep = new Map<number, string>();
  let left = maxChars;
  for (const { p, i } of order) {
    if (left <= 200) break;
    const block = `## ${p.title}\n${p.text}`;
    keep.set(i, block.length <= left ? block : `${block.slice(0, left)}\n(이하 생략)`);
    left -= Math.min(block.length, left) + 2;
  }
  return [...keep.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b).join("\n\n");
}
