import Link from "next/link";
import { missingSchema } from "@/lib/portals/schema";
import { createClient } from "@/lib/supabase/server";
import { loadAppSession } from "@/services/auth/session";

export async function TeacherClasses() {
  const session = await loadAppSession();
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || role !== "teacher") return null;
  const supabase = await createClient();
  const memberships = await supabase
    .from("school_memberships")
    .select("id")
    .eq("user_id", session.userId)
    .eq("membership_role", "teacher")
    .eq("status", "active");
  if (memberships.error) {
    if (!missingSchema(memberships.error)) return null;
    return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Les classes assignées sont indisponibles pour le moment.</p>;
  }
  const ids = (memberships.data ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string");
  if (ids.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border p-5">
        <h2 className="font-display text-lg font-semibold">Classes assignées</h2>
        <p className="mt-2 text-sm text-muted-foreground">{"Une école vous affecte à une classe pour que la liste des élèves apparaisse ici."}</p>
      </section>
    );
  }
  const assigned = await supabase
    .from("teacher_assignments")
    .select("class_subjects(classes(name), subjects(name))")
    .in("membership_id", ids);
  if (assigned.error) return null;
  const rows = (assigned.data ?? []) as Array<{
    class_subjects?: {
      classes?: { name?: string | null } | { name?: string | null }[] | null;
      subjects?: { name?: string | null } | { name?: string | null }[] | null;
    } | Array<{
      classes?: { name?: string | null } | { name?: string | null }[] | null;
      subjects?: { name?: string | null } | { name?: string | null }[] | null;
    }> | null;
  }>;
  const labels = rows.map((row) => {
    const offering = Array.isArray(row.class_subjects) ? row.class_subjects[0] : row.class_subjects;
    const classRow = offering?.classes;
    const subjectRow = offering?.subjects;
    const classLabel = Array.isArray(classRow) ? classRow[0]?.name : classRow?.name;
    const subjectLabel = Array.isArray(subjectRow) ? subjectRow[0]?.name : subjectRow?.name;
    return [classLabel, subjectLabel].filter(Boolean).join(" · ");
  }).filter((label) => label.length > 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Classes et suivi</h2>
        <Link href="/dashboard/attendance" className="text-sm text-primary hover:underline">{"Faire l'appel"}</Link>
      </div>
      {labels.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune classe assignée.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {labels.map((label) => <li key={label} className="rounded-lg border border-border px-3 py-2">{label}</li>)}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{"Les cours, les leçons et les devoirs se gèrent depuis vos cours. La note d'un devoir reste distincte des points d'exercice."}</p>
    </section>
  );
}
