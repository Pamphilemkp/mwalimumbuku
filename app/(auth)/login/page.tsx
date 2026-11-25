import type { Metadata } from "next";
import { loginPageRedirect } from "@/lib/auth/access";
import { singleQueryValue } from "@/lib/auth/redirect";
import { loadAppSession } from "@/services/auth/session";
import Login from "@/src/screens/Login";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Connexion — Mwalimu Mbuku",
};

function noticeCopy(value: unknown): string | null {
  if (value === "password-updated") {
    return "Votre mot de passe a été mis à jour. Connectez-vous avec le nouveau mot de passe.";
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; notice?: string | string[] }>;
}) {
  const params = await searchParams;
  const session = await loadAppSession();
  const target = loginPageRedirect({
    hasSession: session.hasSession,
    resolution: session.resolution,
    requested: singleQueryValue(params.next),
  });
  if (target) redirect(target);

  const notice = noticeCopy(singleQueryValue(params.notice));

  return (
    <>
      {notice ? (
        <p role="status" className="bg-primary/10 px-4 py-3 text-center text-sm text-foreground">
          {notice}
        </p>
      ) : null}
      <Login />
    </>
  );
}
