// 산업 기준표 검수표 만들기 (specs/data-pipeline FR-OPS-01). Read-only: reads companies + company_financials from the
// Supabase project in .env.local, applies the draft rules in lib/reference/industry-map.ts and writes a Korean
// Markdown review sheet. Nothing is written to the DB.
//
//   node scripts/industry-review.mjs <out.md> [ksic-names.tsv]
//
// ksic-names.tsv (optional): "code<TAB>name" lines (한국표준산업분류 names) used to label the codes.
// Needs Node 22.18+ (imports the .ts rule file directly).
import fs from "node:fs";
import { INDUSTRIES, industryForKsic } from "../lib/reference/industry-map.ts";
import { INDUSTRY_OVERRIDES } from "../lib/reference/industry-overrides.ts";

const [outPath, namesPath] = process.argv.slice(2);
if (!outPath) {
  console.error("usage: node scripts/industry-review.mjs <out.md> [ksic-names.tsv]");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const headers = {
  apikey: env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  "User-Agent": "letsgraph-script/1.0", // the secret key is refused from browser-like agents
};

async function all(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, { headers: { ...headers, Range: `${from}-${from + 999}` } });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const names = new Map();
if (namesPath && fs.existsSync(namesPath)) {
  for (const line of fs.readFileSync(namesPath, "utf8").split(/\r?\n/)) {
    const [code, name] = line.split("\t");
    if (code && name) names.set(code.trim(), name.trim());
  }
}
const ksicName = (code) => {
  for (let n = code.length; n >= 2; n--) if (names.has(code.slice(0, n))) return names.get(code.slice(0, n)) + (n < code.length ? " (상위)" : "");
  return "";
};

const companies = await all("companies?select=id,corp_code,name,stock_code,induty_code,industry_id,industry_reviewed&order=id");
const fins = await all("company_financials?select=company_id,year,fs_div,revenue");
const latest = new Map();
for (const f of fins) {
  const cur = latest.get(f.company_id);
  const better = !cur || f.year > cur.year || (f.year === cur.year && f.fs_div === "CFS" && cur.fs_div !== "CFS");
  if (better && f.revenue != null) latest.set(f.company_id, f);
}
const won = (eok) => {
  if (eok == null) return "-";
  const jo = Math.trunc(eok / 10000);
  const rest = Math.abs(eok % 10000);
  return jo ? `${jo}조${rest ? ` ${rest.toLocaleString("ko-KR")}억` : ""}` : `${eok.toLocaleString("ko-KR")}억`;
};
const nameOf = Object.fromEntries(INDUSTRIES.map((i) => [i.id, i.name]));
// same order as lib/reference/classify.ts: per-company exception, holding-company name, then the KSIC rule
const fromName = (name) => {
  const n = (name ?? "").replace(/\s/g, "");
  if (/금융지주$/.test(n)) return "finance";
  if (/(홀딩스|지주)$/.test(n)) return "holding";
  return null;
};
const rows = companies.map((c) => {
  const o = INDUSTRY_OVERRIDES[c.corp_code];
  const byName = o ? null : fromName(c.name);
  const m = o
    ? { industryId: o.industryId, rule: null, ambiguous: false }
    : byName
      ? { industryId: byName, rule: null, ambiguous: false }
      : industryForKsic(c.induty_code);
  return { ...c, ...m, override: !!o, revenue: latest.get(c.id)?.revenue ?? null };
});
const byRevenue = (a, b) => (b.revenue ?? -1) - (a.revenue ?? -1);
const examples = (list, n = 4) =>
  [...list].sort(byRevenue).slice(0, n).map((c) => `${c.name}(${won(c.revenue)})`).join(", ");

const staging = rows.filter((r) => !r.industry_reviewed);
const L = [];
const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
L.push("# 산업 기준표 (Claude 검수본)", "");
L.push(`만든 날: ${today} · 기준: 한국표준산업분류(KSIC, Korean Standard Industrial Classification) 10차 · 규칙: \`app/lib/reference/industry-map.ts\` · 기업별 지정: \`app/lib/reference/industry-overrides.ts\``, "");
L.push("DART(Data Analysis, Retrieval and Transfer System, 전자공시시스템)가 기업마다 붙인 업종 코드를 서비스 산업에 배정한 결과예요. 세부 판단은 Claude가 아래 원칙으로 했고(2026-11-17 결정), 사람은 원칙만 정해요.", "");
L.push("**분류 원칙**", "");
L.push("1. 기업은 취준생이 그 회사를 찾아볼 산업에 둬요. 업종 코드는 출발점이고, 주력 사업과 가치사슬(반도체·2차전지 소부장 등)이 우선이에요.");
L.push("2. 순수 그룹 지주회사는 '지주회사'로 따로 묶어요(이름이 '…홀딩스', '…지주'인 회사 포함). 금융지주는 금융, 지주회사 코드가 붙은 사업 회사는 하는 사업을 따라가요.");
L.push("3. 확인은 사용자가 먼저 보는 곳부터 해요: 매출 상위 기업, 덜 세분된 업종 코드, 지주회사 전체. 나머지는 업종 코드 규칙을 따라요.", "");
L.push(`검수 전 기업 ${staging.length}곳 · 이미 화면에 나오는 기업 ${rows.length - staging.length}곳 · 재무 수치가 있는 기업 ${latest.size}곳 · 기업별 지정 ${rows.filter((r) => r.override).length}곳`, "");

L.push("## 산업별 요약", "", "| 산업 | 영어 식별자 | 기업 수 | 매출 상위 예시 |", "|---|---|---|---|");
for (const ind of INDUSTRIES) {
  const list = staging.filter((r) => r.industryId === ind.id);
  L.push(`| ${ind.name} | \`${ind.id}\` | ${list.length} | ${examples(list) || "-"} |`);
}
L.push("");

// 확인 필요 1: coarse codes that a finer rule would split
const groupBy = (list, key) => {
  const g = new Map();
  for (const r of list) g.set(key(r), [...(g.get(key(r)) ?? []), r]);
  return g;
};
// overrides, grouped by industry
L.push("## 기업별 지정 (업종 코드 대신 주력 사업으로 배정한 곳)", "");
L.push("| 산업 | 기업 |", "|---|---|");
for (const ind of [...INDUSTRIES, { id: null, name: "서비스에서 제외" }]) {
  const list = staging.filter((r) => r.override && r.industryId === ind.id).sort(byRevenue);
  if (list.length) L.push(`| ${ind.name} | ${list.map((r) => r.name).join(", ")} |`);
}
L.push("");

L.push("## 남은 확인 1. 업종 코드가 덜 세분돼서 갈리는 기업", "");
L.push("코드가 짧아서 더 세부 규칙(예: 화학 안의 화장품)으로 갈릴 수 있는데, 기업별 지정을 하지 않은 곳이에요. 상위 산업으로 넣었어요(대부분 매출이 작은 기업).", "");
L.push("| 업종 코드 | 업종명 | 초안 산업 | 기업 수 | 예시 |", "|---|---|---|---|---|");
for (const [code, list] of [...groupBy(staging.filter((r) => r.ambiguous), (r) => r.induty_code)].sort((a, b) => b[1].length - a[1].length)) {
  L.push(`| ${code} | ${ksicName(code)} | ${nameOf[list[0].industryId] ?? "-"} | ${list.length} | ${examples(list, 6)} |`);
}
L.push("");

// 확인 필요 2: holding companies
const holding = staging.filter((r) => r.industryId === "holding").sort(byRevenue);
L.push("## 남은 확인 2. 지주회사", "");
L.push(`'지주회사'로 둔 곳은 ${holding.length}곳이에요(원칙 2). 매출 상위 30곳:`, "");
L.push("| 기업 | 매출 | 업종 코드 |", "|---|---|---|");
for (const r of holding.slice(0, 30)) L.push(`| ${r.name} | ${won(r.revenue)} | ${r.induty_code} |`);
L.push("");

// 확인 필요 3: no code / no rule
const none = staging.filter((r) => !r.industryId && !r.override);
L.push("## 남은 확인 3. 산업을 정하지 못한 기업", "");
L.push(`업종 코드가 없거나 규칙에 없는 코드예요: ${none.length}곳.`, "");
if (none.length) {
  L.push("| 기업 | 업종 코드 | 매출 |", "|---|---|---|");
  for (const r of none.sort(byRevenue).slice(0, 40)) L.push(`| ${r.name} | ${r.induty_code ?? "(없음)"} | ${won(r.revenue)} |`);
  L.push("");
}

// 확인 필요 4: reviewed rows whose current industry differs from the draft rule
const reviewed = rows.filter((r) => r.industry_reviewed);
const diff = reviewed.filter((r) => r.industryId !== r.industry_id);
L.push("## 남은 확인 4. 이미 화면에 나오는 기업 중 규칙과 다른 곳", "");
L.push("이미 화면에 나오는 기업은 바꾸지 않아요. 규칙이 맞는지 보는 참고용이에요.", "");
if (diff.length) {
  L.push("| 기업 | 지금 산업 | 초안 규칙 | 업종 코드 |", "|---|---|---|---|");
  for (const r of diff) L.push(`| ${r.name} | ${nameOf[r.industry_id] ?? r.industry_id} | ${nameOf[r.industryId] ?? "-"} | ${r.induty_code} |`);
} else L.push("없음.");
L.push("");

// full table by industry and code
L.push("## 전체 표 (산업 → 업종 코드)", "");
for (const ind of INDUSTRIES) {
  const list = staging.filter((r) => r.industryId === ind.id);
  if (!list.length) continue;
  L.push(`### ${ind.name} (${list.length}곳)`, "", "| 업종 코드 | 업종명 | 기업 수 | 예시 |", "|---|---|---|---|");
  for (const [code, g] of [...groupBy(list, (r) => r.induty_code)].sort((a, b) => b[1].length - a[1].length)) {
    L.push(`| ${code} | ${ksicName(code)} | ${g.length} | ${examples(g, 5)} |`);
  }
  L.push("");
}

fs.writeFileSync(outPath, L.join("\n"), "utf8");
console.log(JSON.stringify({ staging: staging.length, reviewed: reviewed.length, withRevenue: latest.size, ambiguous: staging.filter((r) => r.ambiguous).length, holding: holding.length, unmatched: none.length, out: outPath }));
