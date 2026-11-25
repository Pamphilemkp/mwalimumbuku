import { createClient } from "@/lib/supabase/server";
import { loadAppSession } from "@/services/auth/session";

type ClassName = { name?: string | null } | { name?: string | null }[] | null;

function className(value: ClassName): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
}

export async function RoleRecords() {
  const session = await loadAppSession();
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || (role !== "teacher" && role !== "parent")) return null;

  const supabase = await createClient();

  if (role === "teacher") {
    const memberships = await supabase
      .from("school_memberships")
      .select("id")
      .eq("user_id", session.userId)
      .eq("membership_role", "teacher")
      .eq("status", "active");
    if (memberships.error) return null;
    const ids = (memberships.data ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string");
    if (ids.length === 0) {
      return (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Aucune classe assignée</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Les classes apparaissent ici lorsqu'une école vous affecte à une matière.
          </p>
        </section>
      );
    }
    const assigned = await supabase
      .from("teacher_assignments")
      .select("class_subjects(classes(name), subjects(name))")
      .in("membership_id", ids);
    if (assigned.error) return null;
    type Offering = {
      classes?: ClassName;
      subjects?: { name?: string | null } | { name?: string | null }[] | null;
    };
    const labels = ((assigned.data ?? []) as Array<{ class_subjects?: Offering | Offering[] | null }>)
      .map((row) => {
        const offering = Array.isArray(row.class_subjects) ? row.class_subjects[0] : row.class_subjects;
        const classLabel = className(offering?.classes ?? null);
        const subject = offering?.subjects;
        const subjectLabel = Array.isArray(subject) ? subject[0]?.name : subject?.name;
        return [classLabel, subjectLabel].filter(Boolean).join(" · ");
      })
      .filter((label) => label.length > 0);
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Classes assignées</h2>
        {labels.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucune classe assignée.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {labels.map((label, index) => (
              <li key={`${label}-${index}`} className="rounded-lg border border-border px-3 py-2">{label}</li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const links = await supabase.from("parent_student").select("student_id").eq("parent_id", session.userId);
  if (links.error) return null;
  const studentIds = (links.data ?? []).map((row) => row.student_id).filter((id): id is string => typeof id === "string");
  if (studentIds.length === 0) return null;
  const memberships = await supabase
    .from("school_memberships")
    .select("id")
    .in("user_id", studentIds)
    .eq("membership_role", "student")
    .eq("status", "active");
  if (memberships.error) return null;
  const ids = (memberships.data ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string");
  if (ids.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Présences</h2>
        <p className="mt-2 text-sm text-muted-foreground">Aucune présence enregistrée.</p>
      </section>
    );
  }
  const attendance = await supabase
    .from("class_attendance")
    .select("status, session_date, classes(name)")
    .in("membership_id", ids)
    .order("session_date", { ascending: false })
    .limit(12);
  if (attendance.error) return null;
  const rows = attendance.data ?? [];
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">Présences</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune présence enregistrée.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map((row, index) => (
            <li key={`${row.session_date}-${index}`} className="rounded-lg border border-border px-3 py-2">
              {className(row.classes) ?? "Classe"} · {row.session_date} · {row.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
