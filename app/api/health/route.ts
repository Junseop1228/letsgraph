// Health check: which data source the server uses and whether the catalogue answers. No secrets in the output.
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { catalog, supabaseEnabled } from "@/lib/data";
import { hasEnvVars } from "@/lib/utils";

export async function GET() {
  await connection();
  const repo = await catalog();
  let companies = -1;
  let error: string | null = null;
  try {
    companies = (await repo.companies()).length;
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 200) : "unknown";
  }
  return NextResponse.json({
    source: repo.source,
    supabaseEnabled: supabaseEnabled(),
    hasEnvVars: !!hasEnvVars,
    dataSourceEnv: process.env.DATA_SOURCE ?? null,
    companies,
    error,
  });
}
