// 공고 주소에서 공고 1건 가져오기 (specs/posting POST-03).
// Only the page the user submitted is fetched, at the user's request, plus at most 3 frames embedded in that
// page when its body is loaded in a frame. No link following, no scheduled collection (NFR-EXT-02).
// Every hop (redirects, frames) is re-checked and its resolved IPs must be public, so the server cannot be
// pointed at internal addresses.
import "server-only";
import { lookup } from "node:dns/promises";
import {
  checkPostingUrl,
  decodeHtml,
  frameSources,
  htmlToText,
  isPrivateIp,
  MAX_TEXT_CHARS,
  MIN_TEXT_CHARS,
  pageTitle,
} from "@/lib/posting/url";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const HTML_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const UA = "Mozilla/5.0 (compatible; LetsGraph/0.1; single page fetched at the user's request)";

export type FetchedPosting =
  | { kind: "text"; text: string; url: string }
  | { kind: "pdf"; data: Uint8Array; url: string }
  | { kind: "image"; data: Uint8Array; mediaType: string; url: string };

/** A failure whose message can be shown to the user as is. */
export class PostingFetchError extends Error {}

const TOO_BIG = "페이지가 너무 커요. 공고 내용을 복사해 붙여넣거나 PDF로 올려 주세요.";
const FAILED = "페이지를 가져오지 못했어요. 잠시 뒤 다시 시도하거나 PDF로 올려 주세요.";

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new PostingFetchError("주소의 사이트를 찾지 못했어요. 주소를 다시 확인해 주세요.");
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new PostingFetchError("공개된 웹 페이지 주소만 넣을 수 있어요.");
}

async function readLimited(res: Response): Promise<Uint8Array> {
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new PostingFetchError(TOO_BIG);
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new PostingFetchError(TOO_BIG);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** GET with manual redirects: each hop is checked again before it is requested. */
async function get(start: URL): Promise<{ type: string; contentType: string | null; url: URL; body: Uint8Array }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/pdf,image/*;q=0.8,*/*;q=0.5", "accept-language": "ko-KR,ko;q=0.9" },
    });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      const location = res.headers.get("location");
      let next: URL | undefined;
      try {
        next = location ? new URL(location, url) : undefined;
      } catch {
        next = undefined;
      }
      if (!next) throw new PostingFetchError(FAILED);
      const checked = checkPostingUrl(next.toString());
      if (!checked.ok) throw new PostingFetchError(checked.error);
      url = checked.url;
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      throw new PostingFetchError("로그인이 필요하거나 접근이 막힌 페이지예요. 공고 내용을 복사해 붙여넣거나 PDF로 올려 주세요.");
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new PostingFetchError(`페이지를 열지 못했어요(응답 ${res.status}). 주소를 확인하거나 PDF로 올려 주세요.`);
    }
    const contentType = res.headers.get("content-type");
    const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
    return { type, contentType, url, body: await readLimited(res) };
  }
  throw new PostingFetchError("다른 주소로 너무 많이 넘어가는 페이지예요. 공고 페이지 주소를 직접 넣어 주세요.");
}

/** Fetches one posting page and returns its text (or the PDF/image itself) for the AI. */
export async function fetchPostingFromUrl(raw: string): Promise<FetchedPosting> {
  const checked = checkPostingUrl(raw);
  if (!checked.ok) throw new PostingFetchError(checked.error);
  try {
    const page = await get(checked.url);
    const url = page.url.toString();
    if (page.type === "application/pdf") return { kind: "pdf", data: page.body, url };
    if (IMAGE_TYPES.includes(page.type)) return { kind: "image", data: page.body, mediaType: page.type, url };
    if (!HTML_TYPES.includes(page.type)) throw new PostingFetchError("웹 페이지, PDF, 이미지가 아닌 주소예요. 공고 페이지 주소를 넣어 주세요.");

    const html = decodeHtml(page.body, page.contentType);
    let text = htmlToText(html);
    if (text.length < MIN_TEXT_CHARS) {
      // the posting body is loaded in a frame: read the frames embedded in this page (no other links)
      for (const frame of frameSources(html, page.url)) {
        const f = checkPostingUrl(frame.toString());
        if (!f.ok) continue;
        try {
          const inner = await get(f.url);
          if (!HTML_TYPES.includes(inner.type)) continue;
          const innerText = htmlToText(decodeHtml(inner.body, inner.contentType));
          if (innerText.length > text.length) text = innerText;
        } catch {
          // try the next frame
        }
        if (text.length >= MIN_TEXT_CHARS) break;
      }
    }
    if (text.length < MIN_TEXT_CHARS) {
      throw new PostingFetchError("페이지에서 공고 본문을 읽지 못했어요. 이미지로만 된 공고이거나 로그인이 필요한 페이지일 수 있어요. 공고 내용을 복사해 붙여넣거나 PDF로 올려 주세요.");
    }
    const title = pageTitle(html);
    return { kind: "text", text: [title ? `페이지 제목: ${title}` : "", text].filter(Boolean).join("\n\n").slice(0, MAX_TEXT_CHARS), url };
  } catch (e) {
    if (e instanceof PostingFetchError) throw e;
    throw new PostingFetchError(FAILED); // timeouts, network errors
  }
}
