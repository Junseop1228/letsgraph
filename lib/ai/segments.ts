// B1 + B2 AI call (specs/data-pipeline FR-OPS-03). One request per company; the output is parsed with its Zod
// contract and checked again in lib/dart/segments.ts before anything is stored (NFR-ORG-02).
// Model: a lighter tier than the interactive tasks (decisions 2026-11-09 PROPOSED, set 2026-11-17 by the token
// budget of D 2026-11-17 20:02): gemini-3.5-flash-lite, override with SEGMENT_MODEL.
import "server-only";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { aiEnabled, AiUnavailable } from "@/lib/ai/tasks";
import { SegmentExtractionAiOutput } from "@/lib/contracts/extraction";
import { SEGMENTS_SYSTEM, segmentsPrompt } from "@/lib/ai/prompts/segments";

export const SEGMENT_MODEL = process.env.SEGMENT_MODEL || "gemini-3.5-flash-lite";
/** a long report on a light model; the batch runs in the background, the first-view path shows progress */
const TIMEOUT_MS = 120_000;

export type SegmentCall = {
  output: SegmentExtractionAiOutput;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
};

export async function extractSegments(input: Parameters<typeof segmentsPrompt>[0]): Promise<SegmentCall> {
  if (!aiEnabled()) throw new AiUnavailable();
  const res = await generateText({
    model: google(SEGMENT_MODEL),
    output: Output.object({ schema: SegmentExtractionAiOutput }),
    system: SEGMENTS_SYSTEM,
    prompt: segmentsPrompt(input),
    // extraction, not reasoning: keep thinking (billed as output) low
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return {
    output: SegmentExtractionAiOutput.parse(res.output),
    usage: { inputTokens: res.usage.inputTokens ?? 0, outputTokens: res.usage.outputTokens ?? 0 /* total output, thinking included */ },
    model: SEGMENT_MODEL,
  };
}
