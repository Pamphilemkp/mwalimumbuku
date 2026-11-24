import type { RoleResolution } from "@/services/auth/get-role";

const COPY: Record<Exclude<RoleResolution["status"], "ok">, { title: string; body: string }> = {
  missing: {
    title: "Account not ready",
    body: "You are signed in, but this account does not have a role yet. Ask a school administrator to assign one before continuing.",
  },
  duplicate: {
    title: "More than one role",
    body: "You are signed in, but this account has more than one role. A dashboard cannot open until a school administrator leaves only one role on the account.",
  },
  invalid: {
    title: "Unrecognized role",
    body: "You are signed in, but the role on this account is not one this app can use. Ask a school administrator to correct it.",
  },
  error: {
    title: "Role check unavailable",
    body: "You are signed in, but we could not confirm your role just now. Please try again in a few minutes.",
  },
};

export function HoldingView({ resolution }: { resolution: RoleResolution | null }) {
  const status = resolution && resolution.status !== "ok" ? resolution.status : "error";
  const copy = COPY[status];

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.body}</p>
    </section>
  );
}
