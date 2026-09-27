// Only known app destinations. The sole allowed query is a 32-character crew token.
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || value.length > 250) return "/account";
  if (/^\/crew\/join\?token=[A-Za-z0-9_-]{32}$/.test(value)) return value;
  return /^(?:\/account|\/profile|\/events|\/reset-password|\/admin(?:\/[a-zA-Z0-9_-]+)*|\/e\/[a-z0-9-]+\/claim|\/scan\/[a-zA-Z0-9_-]+)$/.test(value)
    ? value
    : "/account";
}

export function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}
