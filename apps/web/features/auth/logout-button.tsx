"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { runSignOut } from "@/features/auth/sign-out";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);

    const result = await runSignOut(() => {
      const supabase = createClient();
      return supabase.auth.signOut();
    });

    if (result.status === "failed") {
      setError(result.message);
      setPending(false);
      return;
    }

    router.refresh();
    router.push("/login");
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
