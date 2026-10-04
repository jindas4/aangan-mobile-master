/** Host verification steps the backend reports as `missing` on a 403
 *  {reason: "verification_required"} from publishing a listing. */
const STEP_LABEL: Record<string, string> = {
  phone: "verify your phone number",
  email: "verify your email address",
  aadhaar: "verify your identity (Aadhaar)",
  payout: "add a payout method",
};

/** The missing steps if this error is the publish gate, otherwise null. */
export function verificationMissing(e: any): string[] | null {
  const d = e?.body?.detail;
  if (e?.status !== 403 || d?.reason !== "verification_required") return null;
  return Array.isArray(d.missing) ? d.missing : [];
}

export function describeMissing(missing: string[]): string {
  const steps = missing.map((m) => STEP_LABEL[m] ?? m);
  if (steps.length === 0) return "complete host verification";
  if (steps.length === 1) return steps[0];
  return `${steps.slice(0, -1).join(", ")} and ${steps[steps.length - 1]}`;
}
