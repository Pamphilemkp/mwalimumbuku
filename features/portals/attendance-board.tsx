import { recordAttendanceAction } from "@/features/portals/actions";
import { missingSchema } from "@/lib/portals/schema";
import { createClient } from "@/lib/supabase/server";
import { loadAppSession } from "@/services/auth/session";
import { AttendanceForm } from "./attendance-form";

type StudentOption = { membershipId: string; name: string };
type ClassOption = { id: string; name: string; students: StudentOption[] };

function label(value: { name?: string | null } | { name?: string | null }[] | null | undefined, fallback: string) {
  if (!value) return fallback;
  const name = Array.isArray(value) ? value[0]?.name : value.name;
  return name || fallback;
}

export async function AttendanceBoard() {
  const session = await loadAppSession();
  const role = session.resolution?.status === "ok" ? session.resolution.role : null;
  if (!session.userId || !role) return null;
  const supabase = await createClient();

  const classes: ClassOption[] = [];
  if (role === "teacher") {
    const memberships = await supabase
      .from("school_memberships")
      .select("id")
      .eq("user_id", session.userId)
      .eq("membership_role", "teacher")
      .eq("status", "active");
    if (memberships.error && missingSchema(memberships.error)) {
      return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Le registre de classe est indisponible pour le moment.</p>;
    }
    const ids = (memberships.data ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string");
    if (ids.length > 0) {
      const assigned = await supabase
        .from("teacher_assignments")
        .select("class_subjects(class_id, classes(id, name))")
        .in("membership_id", ids);
      const classIds = new Set<string>();
      const rows = (assigned.data ?? []) as Array<{
        class_subjects?: { classes?: { id?: string } | { id?: string }[] | null } | { classes?: { id?: string } | { id?: string }[] | null }[] | null;
      }>;
      for (const row of rows) {
        const offering = Array.isArray(row.class_subjects) ? row.class_subjects[0] : row.class_subjects;
        const classRow = offering?.classes;
        const id = Array.isArray(classRow) ? classRow[0]?.id : classRow?.id;
        if (typeof id === "string") classIds.add(id);
      }
      for (const classId of classIds) {
        const info = await supabase.from("classes").select("id, name").eq("id", classId).maybeSingle();
        const roster = await supabase
          .from("student_enrollments")
          .select("membership_id")
          .eq("class_id", classId)
          .eq("status", "active");
        const membershipIds = (roster.data ?? []).map((row) => row.membership_id).filter((id): id is string => typeof id === "string");
        const membershipRows = membershipIds.length
          ? await supabase.from("school_memberships").select("id, user_id").in("id", membershipIds)
          : { data: [] };
        const userIds = (membershipRows.data ?? [])
          .map((row) => (typeof row.user_id === "string" && typeof row.id === "string" ? { membershipId: row.id, userId: row.user_id } : null))
          .filter((row): row is { membershipId: string; userId: string } => Boolean(row));
        const profiles = userIds.length
          ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds.map((row) => row.userId))
          : { data: [] };
        classes.push({
          id: classId,
          name: info.data?.name || "Classe",
          students: userIds.map((row) => ({
            membershipId: row.membershipId,
            name: profiles.data?.find((profile) => profile.user_id === row.userId)?.full_name || "Élève",
          })),
        });
      }
    }
  }

  const history = await supabase
    .from("class_attendance")
    .select("id, status, session_date, classes(name)")
    .order("session_date", { ascending: false })
    .limit(40);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Présences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {"La date est le jour scolaire, conservée comme une date de calendrier. Un changement de statut reste dans l'historique."}
        </p>
      </div>
      {role === "teacher" ? (
        classes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Aucune classe assignée.</p>
        ) : (
          <AttendanceForm classes={classes} action={recordAttendanceAction} />
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          {role === "student"
            ? "Vos présences enregistrées par vos enseignants."
            : role === "parent"
              ? "Présences des enfants liés à votre compte."
              : "Présences visibles pour votre compte."}
        </p>
      )}
      {history.error ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {missingSchema(history.error) ? "Le registre est indisponible pour le moment." : "La liste des présences est indisponible pour le moment."}
        </p>
      ) : (history.data ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Aucune présence enregistrée.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {(history.data ?? []).map((row) => (
            <li key={String(row.id)} className="rounded-lg border border-border bg-card px-3 py-2">
              {label(row.classes, "Classe")} · {String(row.session_date)} · {String(row.status)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
