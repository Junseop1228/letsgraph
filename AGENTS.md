# AGENTS.md — letsgraph app

Entry point for any coding agent working in this repo. Project-level context (contest, team, decisions) lives one folder up in the project workspace (`../AGENTS.md`, `../context/`); this file covers the app only.

## Stack (confirmed 2026-10-22, see ../context/decisions.md)
Next.js (App Router) + TypeScript, Supabase (PostgreSQL, Auth, pgvector), shadcn/ui on Radix + Tailwind CSS v4, Vercel AI SDK + Zod (provider: Gemini), collector = Supabase pg_cron + pgmq + Edge Functions, charts = ECharts + Recharts, graph = React Flow (`@xyflow/react`) + d3-force layout + bubblesets-js group planes (탐색 graph, see `specs/explore`), swipe = own component on Motion, tests = Vitest + Playwright, measurement = PostHog, LLM trace = Langfuse (metadata only). Hosting: Vercel + Supabase Cloud.

## Three sources of truth
1. **Behaviour -> `specs/`** (OpenSpec format, chosen 2026-11-13). One `specs/<capability>/spec.md` per capability = the current truth. Requirements use SHALL; every requirement has at least one Scenario (WHEN / THEN). If code changes behaviour, update the spec in the same commit. Requirement IDs keep the SRS FR IDs (never reuse a removed ID).
2. **Look -> `design/DESIGN.md`** (copied from ../DESIGN.md by `npm run tokens`). Never write raw colours, sizes or radii in components; use the generated token utilities (`bg-bg-sunken`, `text-text-secondary`, `text-heading-1`, `rounded-element`, `figures` ...). Dark values: `design/dark.json`.
3. **Data shapes -> code contracts.** DB schema = `supabase/migrations/*.sql`; AI outputs, API inputs and external payloads = Zod schemas in `lib/contracts/`. Types are inferred from these, never hand-copied. Specs link to them by path.

## Rules
- UI copy is Korean (해요체, short). Domain terms use the glossary pair KO name + EN identifier (`../context/glossary.md`) verbatim in code and DB.
- Secrets only in `.env.local` / Vercel env. Never commit keys; never send them to the browser (server-only modules for DART, Gemini, Supabase secret key).
- Every AI output is validated with its Zod schema before it is stored or shown, and is labelled as AI-made in the UI.
- External data: OpenDART (show source and 기준 시점), no crawling of job platforms, no news article bodies.
- Payments: Toss Payments test mode only; verify amount server-side against the stored order; confirm and grant are idempotent (see `specs/billing/spec.md`). Vendor docs: official developer center or the `@tosspayments/integration-guide-mcp` server.
- Commands: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run tokens`.
