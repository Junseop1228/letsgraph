// GitHub 저장소 읽기 (specs/portfolio PORT-06). Public REST API only, no page scraping: repository info, topics,
// languages and the README. Unauthenticated calls allow 60 an hour per server IP; GITHUB_TOKEN (optional, read-only)
// raises that. Errors carry a message that can be shown to the user as is.
import "server-only";
import type { ActivityLink } from "@/lib/activity/link";

export class RepoReadError extends Error {}

export type RepoSnapshot = {
  url: string;
  fullName: string;
  description: string;
  topics: string[];
  languages: string[];
  createdAt: string; // YYYY-MM-DD
  pushedAt: string; // YYYY-MM-DD
  homepage: string;
  fork: boolean;
  readme: string; // at most 30,000 characters
};

const API = "https://api.github.com";
const README_MAX = 30_000;

async function gh(path: string, accept = "application/vnd.github+json"): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  try {
    return await fetch(`${API}${path}`, {
      headers: {
        Accept: accept,
        "User-Agent": "letsgraph",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new RepoReadError("GitHub에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  }
}

function failed(res: Response): never {
  if (res.status === 404) throw new RepoReadError("저장소를 찾지 못했어요. 주소가 맞는지, 공개 저장소인지 확인해 주세요.");
  if (res.status === 403 || res.status === 429) throw new RepoReadError("GitHub 요청 한도에 걸렸어요. 잠시 뒤 다시 시도해 주세요.");
  throw new RepoReadError("저장소를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.");
}

const day = (iso: unknown) => (typeof iso === "string" ? iso.slice(0, 10) : "");

export async function readRepo(link: ActivityLink): Promise<RepoSnapshot> {
  const base = `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}`;
  const info = await gh(base);
  if (!info.ok) failed(info);
  const r = (await info.json()) as Record<string, unknown>;
  if (r.private) throw new RepoReadError("공개 저장소만 읽을 수 있어요.");

  const [langRes, readmeRes] = await Promise.all([gh(`${base}/languages`), gh(`${base}/readme`, "application/vnd.github.raw+json")]);
  const langs = langRes.ok ? ((await langRes.json()) as Record<string, number>) : {};
  const readme = readmeRes.ok ? (await readmeRes.text()).slice(0, README_MAX) : "";

  return {
    url: link.url,
    fullName: typeof r.full_name === "string" ? r.full_name : `${link.owner}/${link.repo}`,
    description: typeof r.description === "string" ? r.description : "",
    topics: Array.isArray(r.topics) ? (r.topics as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 12) : [],
    languages: Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name),
    createdAt: day(r.created_at),
    pushedAt: day(r.pushed_at),
    homepage: typeof r.homepage === "string" ? r.homepage : "",
    fork: r.fork === true,
    readme,
  };
}
