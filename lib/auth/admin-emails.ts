// 관리자 (specs/data-pipeline FR-OPS-04): admins are the e-mail addresses in ADMIN_EMAILS (comma separated).
// Pure part (parsing and matching), unit-tested; the session check is in lib/auth/admin.ts.

/** "A@x.com, b@y.com ," -> ["a@x.com", "b@y.com"] */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export function isAdminEmail(email: string | null | undefined, admins: string[]): boolean {
  return !!email && admins.includes(email.trim().toLowerCase());
}
