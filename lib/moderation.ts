import { api } from "./api";

// Report reasons must match the backend Literal in app/schemas/moderation.py.
export const REPORT_REASONS: { code: string; label: string }[] = [
  { code: "spam", label: "Spam or misleading" },
  { code: "harassment", label: "Harassment or bullying" },
  { code: "hate", label: "Hate speech" },
  { code: "sexual", label: "Sexual or explicit content" },
  { code: "violence", label: "Violence or threats" },
  { code: "scam", label: "Scam or fraud" },
  { code: "illegal", label: "Illegal activity" },
  { code: "other", label: "Something else" },
];

export type ReportTarget = "message" | "review" | "listing" | "user" | "conversation";

export async function reportContent(
  targetType: ReportTarget,
  targetId: string,
  reason: string,
  detail?: string,
) {
  await api("/api/reports", {
    method: "POST",
    body: { target_type: targetType, target_id: targetId, reason, detail: detail || null },
  });
}

export async function blockUser(userId: string) {
  await api(`/api/blocks/${userId}`, { method: "POST" });
}

export async function unblockUser(userId: string) {
  await api(`/api/blocks/${userId}`, { method: "DELETE" });
}

export async function fetchBlockedIds(): Promise<string[]> {
  const r = await api<{ blocked_ids: string[] }>("/api/blocks");
  return r.blocked_ids;
}
