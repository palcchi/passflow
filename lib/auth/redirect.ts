// Only known app destinations; queries, encoded paths and external URLs are rejected.
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || value.length > 250) return "/account";
  return /^(?:\/account|\/admin(?:\/[a-zA-Z0-9_-]+)*|\/e\/[a-z0-9-]+\/claim|\/scan\/[a-zA-Z0-9_-]+)$/.test(value) ? value : "/account";
}
export function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}
