// 공용 근거의 흔적 (specs/safety SAFE-03): which evidence rows came from the same person, without saying who. The user
// id is mixed with a server secret (EVIDENCE_HASH_SECRET), so the hash cannot be turned back into an id or matched
// against ids without the secret. No secret: no hash (null). Pure apart from node:crypto, unit-tested.
import { createHmac } from "node:crypto";

/** 16 hex characters, or null when there is no secret. */
export function creatorHash(uid: string, secret: string | undefined): string | null {
  if (!secret || secret.length < 16) return null;
  return createHmac("sha256", secret).update(`job-evidence:${uid}`).digest("hex").slice(0, 16);
}

/** 공고 근거 하루 확인 수 (SAFE-03): postings a person adds in a day that may be checked into shared data. */
export const EVIDENCE_DAILY_LIMIT = 10;

/** True while the person's postings today (this one included) are within the limit. */
export const mayCheckEvidence = (postingsToday: number) => postingsToday <= EVIDENCE_DAILY_LIMIT;
