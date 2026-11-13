// Korean particles that depend on the last syllable (받침).
function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return /[013678lmn]$/i.test(ch); // digits/latin read aloud: rough rule
  return (code - 0xac00) % 28 !== 0;
}
/** 은/는 */
export const eunNeun = (w: string) => `${w}${hasBatchim(w) ? "은" : "는"}`;
/** 이/가 */
export const iGa = (w: string) => `${w}${hasBatchim(w) ? "이" : "가"}`;
/** 을/를 */
export const eulReul = (w: string) => `${w}${hasBatchim(w) ? "을" : "를"}`;
/** 과/와 */
export const gwaWa = (w: string) => `${w}${hasBatchim(w) ? "과" : "와"}`;
