import { createClient } from "@/lib/supabase/server";
import { loadAppSession } from "@/services/auth/session";

type Membership = {
  schools: { name: string } | { name: string }[] | null;
};

export async function SchoolAssignmentNotice() {
  const session = await loadAppSession();
  if (!session.userId || session.resolution?.status !== "ok") return null;
  if (session.resolution.role === "admin") return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_memberships")
    .select("schools(name)")
    .eq("user_id", session.userId)
    .eq("status", "active");
  if (error) return null;

  const names = ((data ?? []) as Membership[])
    .map((row) => (Array.isArray(row.schools) ? row.schools[0]?.name : row.schools?.name))
    .filter((name): name is string => Boolean(name));

  if (names.length > 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
        École : {names.join(", ")}
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">Aucune école assignée</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Ce compte n'est inscrit dans aucune école. Le catalogue commun reste disponible. Les classes, les devoirs de classe et les présences apparaîtront lorsqu'une école aura fait l'inscription.
      </p>
    </section>
  );
}
