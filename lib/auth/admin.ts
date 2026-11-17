// 관리자 세션 확인 (specs/data-pipeline FR-OPS-04). Server only: the signed-in user's e-mail (from the verified session
// claims) must be in ADMIN_EMAILS. Admin pages call requireAdmin(), which answers "not found" to everyone else.
import "server-only";
import { notFound } from "next/navigation";
import { supabaseEnabled } from "@/lib/data";
import { isAdminEmail, parseAdminEmails } from "@/lib/auth/admin-emails";

export async function currentAdmin(): Promise<{ email: string } | null> {
  const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (!admins.length || !supabaseEnabled()) return null;
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const email = data?.claims?.email as string | undefined;
  return isAdminEmail(email, admins) ? { email: email! } : null;
}

export async function requireAdmin(): Promise<{ email: string }> {
  const admin = await currentAdmin();
  if (!admin) notFound();
  return admin;
}
