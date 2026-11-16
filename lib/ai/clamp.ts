// AI 결과 길이 맞추기 (specs/portfolio PORT-02): a result that is a little too long is trimmed to the contract instead of
// being thrown away. Nothing is added or reworded; text is only cut (at a sentence end when one is close). Pure, unit-tested.
import type { z } from "zod";
import {
  ActivityOutput,
  EpisodeSuggestionOutput,
  ExperienceOutput,
  type ActivityAiOutput,
  type EpisodeAiOutput,
  type EpisodeSuggestion,
  type EpisodeSuggestionAiOutput,
} from "@/lib/contracts/activity";

/** Collapses whitespace and cuts to at most `max` characters, preferring the last sentence end in the kept part. */
export function cutText(s: string | undefined, max: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const end = Math.max(head.lastIndexOf("다."), head.lastIndexOf("요."), head.lastIndexOf(". "));
  if (end >= max * 0.6) return head.slice(0, end + (head[end] === "." ? 1 : 2)).trim();
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

const opt = (s: string | undefined, max: number) => cutText(s, max) || undefined;

export function clampActivity(raw: z.infer<typeof ActivityAiOutput>): ActivityOutput {
  return ActivityOutput.parse({
    title: cutText(raw.title, 40) || "이름 없는 활동",
    kind: raw.kind,
    period: opt(raw.period, 40),
    role: opt(raw.role, 200),
    dataset: opt(raw.dataset, 200),
    summary: cutText(raw.summary, 800),
    scenes: (raw.scenes ?? [])
      .filter((s) => s.title.trim())
      .slice(0, 5)
      .map((s) => ({ title: cutText(s.title, 40), hint: cutText(s.hint, 200) })),
  });
}

export function clampEpisode(raw: z.infer<typeof EpisodeAiOutput>): ExperienceOutput {
  const competencies = [...new Set(raw.competencies.map((c) => cutText(c, 20)).filter(Boolean))].slice(0, 5);
  return ExperienceOutput.parse({
    title: cutText(raw.title, 40) || "새 에피소드",
    kind: raw.kind,
    theme: raw.theme,
    period: opt(raw.period, 40),
    situation: cutText(raw.situation, 300),
    role: opt(raw.role, 200),
    action: cutText(raw.action, 400),
    result: cutText(raw.result, 300),
    learning: opt(raw.learning, 300),
    competencies,
  });
}

export function clampSuggestions(raw: z.infer<typeof EpisodeSuggestionAiOutput>): EpisodeSuggestion[] {
  return EpisodeSuggestionOutput.parse({
    suggestions: raw.suggestions
      .filter((s) => s.title.trim())
      .slice(0, 4)
      .map((s) => ({ theme: s.theme, title: cutText(s.title, 40), why: cutText(s.why, 120) })),
  }).suggestions;
}

/** Server log line for a failed AI call: error type and message only, no user content or keys. */
export function logAiFailure(task: string, e: unknown) {
  const err = e as { name?: string; message?: string; statusCode?: number };
  console.error(`[ai:${task}] ${err?.name ?? "Error"}${err?.statusCode ? ` ${err.statusCode}` : ""}: ${String(err?.message ?? e).slice(0, 300)}`);
}
