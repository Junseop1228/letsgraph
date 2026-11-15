// 공고 주소로 정리하기의 순수 함수 (specs/posting POST-03): 주소 검사, 사설 주소 차단, HTML -> 본문 텍스트.
// Network code lives in lib/posting/fetch.ts. This file stays free of "server-only" so unit tests can import it.
import { isIP } from "node:net";

export const MIN_TEXT_CHARS = 200; // shorter than this = the page body was not readable
export const MAX_TEXT_CHARS = 20_000; // cap what is sent to the AI

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

const NOT_PUBLIC = "공개된 웹 페이지 주소만 넣을 수 있어요.";
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet"];

/** "7479:1f6f" or "116.121.31.111" (the tail of a 64:ff9b:: address) -> "116.121.31.111"; anything else -> null. */
function nat64ToIpv4(tail: string): string | null {
  if (isIP(tail) === 4) return tail;
  const groups = tail.split(":");
  if (groups.length > 2 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const [hi, lo] = groups.length === 2 ? groups.map((g) => parseInt(g, 16)) : [0, parseInt(groups[0], 16)];
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join(".");
}

/** Is this IP address private, loopback, link-local or otherwise not on the public internet? */
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (v === 6) {
    const x = ip.toLowerCase();
    if (x === "::" || x === "::1") return true;
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (x.startsWith("::ffff:")) return true; // hex-form IPv4-mapped: refuse rather than decode
    // NAT64 (64:ff9b::/96): IPv6-only networks such as phone hotspots return every IPv4 site in this form.
    // Judge the IPv4 address embedded in it instead of refusing the whole prefix.
    if (x.startsWith("64:ff9b::")) {
      const v4 = nat64ToIpv4(x.slice("64:ff9b::".length));
      return v4 ? isPrivateIp(v4) : true;
    }
    return /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith("ff") || x.startsWith("64:ff9b");
  }
  return true; // not an IP literal: callers resolve the name first
}

/** Checks a user-entered posting address before anything is fetched. */
export function checkPostingUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "공고 주소 형식이 올바르지 않아요. https://로 시작하는 주소를 넣어 주세요." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "http 또는 https 주소만 넣을 수 있어요." };
  if (url.username || url.password) return { ok: false, error: "아이디나 비밀번호가 들어간 주소는 쓸 수 없어요." };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, error: NOT_PUBLIC };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateIp(host)) return { ok: false, error: NOT_PUBLIC };
  } else if (host === "localhost" || !host.includes(".") || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, error: NOT_PUBLIC };
  }
  url.hash = "";
  return { ok: true, url };
}

const NAMED: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", middot: "·", bull: "•", hellip: "…",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", times: "×",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Decodes page bytes with the charset from the header or the page's meta tag (many Korean sites still use EUC-KR). */
export function decodeHtml(bytes: Uint8Array, contentType: string | null): string {
  const fromHeader = contentType?.match(/charset=["']?([\w-]+)/i)?.[1];
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const label = (fromHeader ?? fromMeta ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

// Blocks whose content is never posting text. <form> is kept: some sites wrap the whole page in one.
const DROP = ["script", "style", "noscript", "svg", "template", "head", "nav", "footer", "select", "button", "iframe"];

/** Turns a page into plain text lines: drops scripts, menus and footers, keeps line breaks of blocks and list items. */
export function htmlToText(html: string): string {
  let s = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of DROP) s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|section|article|li|tr|table|ul|ol|dl|dt|dd|h[1-6]|header|main)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(s)
    .split("\n")
    .map((l) => l.replace(/[ \t\u00a0\u200b]+/g, " ").trim())
    .filter((l) => l && l !== "-")
    .join("\n");
}

/** The page title (og:title first), used as a hint for the company and position. */
export function pageTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const t = og ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const clean = t ? decodeEntities(t).replace(/\s+/g, " ").trim().slice(0, 200) : "";
  return clean || undefined;
}

/** Frames embedded in the page (some job sites load the posting body in an iframe). At most 3. */
export function frameSources(html: string, base: URL): URL[] {
  const out: URL[] = [];
  for (const m of html.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    try {
      const u = new URL(decodeEntities(m[1]), base);
      if (u.protocol === "https:" || u.protocol === "http:") out.push(u);
    } catch {
      // not a usable frame address
    }
  }
  return out.slice(0, 3);
}
