"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);

    try {
      const result = await signOutAction();
      if (result.status === "failed") {
        setError(result.message);
        setPending(false);
        return;
      }
      router.refresh();
      router.push("/login");
    } catch {
      setError("Sign-out is unavailable right now. Try again in a few minutes.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
