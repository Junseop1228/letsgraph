// 활동 링크 (specs/portfolio PORT-06): which addresses an activity card can be made from. GitHub repositories only for
// now; adding a site later means adding it to ACTIVITY_LINK_SITES and teaching the reader. Pure, unit-tested.

/** Sites allowed for activity links. */
export const ACTIVITY_LINK_SITES = ["github.com"] as const;
export const NOT_ALLOWED_MESSAGE = "지금은 GitHub 저장소 주소만 넣을 수 있어요. 다른 활동은 글로 소개하거나 PDF로 올려 주세요.";

export type ActivityLink = { kind: "github"; owner: string; repo: string; url: string };

/** github.com paths that are not repositories */
const NOT_OWNERS = new Set(["settings", "orgs", "topics", "features", "marketplace", "explore", "login", "signup", "sponsors", "about", "pricing", "search", "notifications", "collections", "trending", "enterprise", "apps"]);
const NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

/**
 * "github.com/owner/repo", "https://www.github.com/owner/repo.git", ".../owner/repo/tree/main/src" -> the repository at
 * https://github.com/owner/repo. Any other site, or a GitHub page that is not a repository, is an error to show as is.
 */
export function parseActivityLink(raw: string): { link: ActivityLink } | { error: string } {
  const s = raw.trim();
  if (!s) return { error: "저장소 주소를 넣어 주세요." };
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return { error: "주소 형식이 올바르지 않아요." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "주소 형식이 올바르지 않아요." };
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!(ACTIVITY_LINK_SITES as readonly string[]).includes(host)) return { error: NOT_ALLOWED_MESSAGE };
  const [owner, rawRepo] = u.pathname.split("/").filter(Boolean);
  const repo = (rawRepo ?? "").replace(/\.git$/i, "");
  if (!owner || !repo || NOT_OWNERS.has(owner.toLowerCase()) || !NAME.test(owner) || !NAME.test(repo)) {
    return { error: "저장소 주소(github.com/계정/저장소)를 넣어 주세요." };
  }
  return { link: { kind: "github", owner, repo, url: `https://github.com/${owner}/${repo}` } };
}

/** The first web address in a chat message ("이거 봐 주세요 https://github.com/a/b" -> "https://github.com/a/b"). */
export function findLink(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>()"']+|(?:www\.)?github\.com\/[^\s<>()"']+/i);
  return m ? m[0].replace(/[.,!?)\]]+$/, "") : null;
}
