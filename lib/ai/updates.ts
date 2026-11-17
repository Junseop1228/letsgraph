// B3 AI call (specs/company FR-CORP-02): which segment each recent filing is about. Small call per company on the
// same light model as B1/B2. Output parsed with Zod; ids are checked again in lib/dart/updates.ts.
import "server-only";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { aiEnabled, AiUnavailable } from "@/lib/ai/tasks";
import { SEGMENT_MODEL } from "@/lib/ai/segments";
import { UPDATES_SYSTEM, updatesPrompt } from "@/lib/ai/prompts/updates";

const UpdateTagsAiOutput = z.object({
  tags: z.array(z.object({ i: z.number(), segmentId: z.string().nullable() })),
});

export async function tagUpdates(input: Parameters<typeof updatesPrompt>[0]): Promise<{ tags: (string | null)[]; usage: { inputTokens: number; outputTokens: number } }> {
  if (!aiEnabled()) throw new AiUnavailable();
  const res = await generateText({
    model: google(SEGMENT_MODEL),
    output: Output.object({ schema: UpdateTagsAiOutput }),
    system: UPDATES_SYSTEM,
    prompt: updatesPrompt(input),
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    abortSignal: AbortSignal.timeout(60_000),
  });
  const out = UpdateTagsAiOutput.parse(res.output);
  const tags: (string | null)[] = input.titles.map(() => null);
  for (const t of out.tags) if (Number.isInteger(t.i) && t.i >= 0 && t.i < tags.length) tags[t.i] = t.segmentId;
  return { tags, usage: { inputTokens: res.usage.inputTokens ?? 0, outputTokens: res.usage.outputTokens ?? 0 } };
}
