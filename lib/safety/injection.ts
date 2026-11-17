// 지시 주입 걸러내기 (specs/safety SAFE-01): text from outside (a posting page, a README, a company page) may carry
// sentences written for an AI ("이전 지시를 무시하고…", "ignore previous instructions"). They are never passed on into
// the 프롬프트 키트, which the user pastes into their own AI. Rules only, no AI. The rules look for instructions aimed at
// an AI, not for AI topics, so postings for AI jobs ("시스템 프롬프트 설계 경험", "As an AI engineer, you will…") pass.
// Pure, unit-tested (tests/injection.test.ts, samples in tests/fixtures/injection).

const PATTERNS: RegExp[] = [
  // English: telling the reader to drop its instructions, or addressing the AI and giving it a new role
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|any|your)\b[^.\n]{0,20}\b(instructions?|prompts?|rules?|directions?)\b/i,
  /\b(reveal|print|show|repeat|output)\b[^.\n]{0,20}\b(your|the)\s+(system\s+prompt|instructions)\b/i,
  /\byou\s+are\s+now\b/i,
  /\byou\s+are\s+(chat\s?gpt|gpt|claude|gemini|an?\s+(llm|language\s+model|ai\s+(assistant|model|language\s+model)))\b/i,
  /\bdear\s+(ai|assistant|chat\s?gpt|gpt|llm|model)\b/i,
  /\b(ai|llm|assistant|model)\s*[,:]\s*(ignore|disregard|rate|score|output|answer|respond|say|mark)\b/i,
  // Korean
  /(이전|위의?|앞의?|기존|모든)\s*(의\s*)?(지시|명령|지침|규칙|프롬프트)(를|을|는|은)?[^.\n]{0,20}(무시|잊|따르지\s*마)/,
  /시스템\s*프롬프트(를|을)?\s*[^.\n]{0,10}(무시|공개|출력|보여|알려)/,
  /(너는|넌|당신은)\s*(이제부터|지금부터|앞으로)/,
  /(AI|에이아이|인공지능|챗\s?GPT|ChatGPT|GPT|LLM|언어\s*모델|제미나이|클로드)\s*(에게|야|님)\s*[,:]?[^.\n]{0,40}(지시|명령|무시|출력|답하|답해|대답|평가하|평가해|점수를?\s*(주|매기))/i,
  /(지원자|이\s*사람)[^.\n]{0,20}(모든|전부)[^.\n]{0,20}(충족|적합|합격)[^.\n]{0,10}(으로|라고|다고)\s*(답|판단|평가|출력)/,
];

/** True when the text reads like an instruction to an AI rather than content. */
export function isSuspicious(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}

/** Splits items into the ones to keep and the ones that look like instructions to an AI. */
export function scrub<T extends string>(items: readonly T[]): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const x of items) (isSuspicious(x) ? dropped : kept).push(x);
  return { kept, dropped };
}
