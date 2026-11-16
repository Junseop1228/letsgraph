// 조사 붙이기: "협업·갈등" + 으로 / "직무 관심 계기" + 로. Pure, unit-tested.

/** "으로" after a final consonant other than ㄹ, otherwise "로". Non-Hangul endings get "로". */
export function josaRo(word: string): "으로" | "로" {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "로";
  const jong = code % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

export const withRo = (word: string) => `${word}${josaRo(word)}`;
