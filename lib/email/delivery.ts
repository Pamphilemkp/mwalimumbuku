export type EmailKind = "password_recovery" | "auth_signup" | "notification";
export type EmailStatus = "accepted" | "failed" | "unconfigured";
export type EmailDetail = "accepted" | "provider_unreachable" | "provider_rejected" | "unconfigured" | "notification_in_app";

export type EmailOutcome = { kind: EmailKind; status: EmailStatus; detail: EmailDetail };

const DETAILS = new Set<EmailDetail>([
  "accepted",
  "provider_unreachable",
  "provider_rejected",
  "unconfigured",
  "notification_in_app",
]);

export function emailOutcome(kind: EmailKind, error: { name?: string; status?: number } | null): EmailOutcome {
  if (!error) return { kind, status: "accepted", detail: "accepted" };
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return { kind, status: "failed", detail: "provider_unreachable" };
  }
  return { kind, status: "failed", detail: "provider_rejected" };
}

export function notificationEmailOutcome(): EmailOutcome {
  return { kind: "notification", status: "unconfigured", detail: "notification_in_app" };
}

export function isRecordableEmailOutcome(value: EmailOutcome): boolean {
  return DETAILS.has(value.detail) && value.detail.length <= 40 && !value.detail.includes("@");
}
