import {
  addStudentMembershipAction,
  notifySchoolAction,
  provisionTeacherAction,
  setCoursePublishedAction,
  setSchoolStatusAction,
  suspendMembershipAction,
} from "@/features/admin/actions";

type Membership = { id: string; user_id: string; membership_role: string; status: string };
type Course = { id: string; title: string; is_published: boolean };
type Audit = { id: string; action: string; summary: string; created_at: string };
type LoadState = "ready" | "error";

const field = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function SchoolAdminTools({
  schoolId,
  schoolStatus,
  memberships,
  names,
  courses,
  audit,
  rosterState,
  courseState,
  auditState,
}: {
  schoolId: string;
  schoolStatus: string;
  memberships: Membership[];
  names: Record<string, string>;
  courses: Course[];
  audit: Audit[];
  rosterState: LoadState;
  courseState: LoadState;
  auditState: LoadState;
}) {
  return (
    <div className="mt-6 space-y-6 border-t border-border pt-6">
      <div>
        <h3 className="font-display text-base font-semibold">Administration de l'école</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Les comptes existent déjà. Un code élève relie ce compte à cette école. Le courriel de notification reste dans l'application tant qu'aucun service de courriel n'est configuré au-delà de l'authentification.
        </p>
      </div>
      <form action={setSchoolStatusAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="schoolId" value={schoolId} />
        <label className="text-sm font-medium">
          Statut
          <select name="status" defaultValue={schoolStatus} aria-label="Statut de l'école" className={`${field} mt-1`}>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md border border-border px-3 text-sm">Enregistrer le statut</button>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={provisionTeacherAction} className="space-y-2">
          <input type="hidden" name="schoolId" value={schoolId} />
          <p className="text-sm font-medium">Rattacher un enseignant</p>
          <input name="code" required minLength={4} maxLength={32} placeholder="Code du compte" aria-label="Code du compte enseignant" className={field} />
          <button type="submit" className="h-10 rounded-md border border-border px-3 text-sm">Ajouter l'enseignant</button>
        </form>
        <form action={addStudentMembershipAction} className="space-y-2">
          <input type="hidden" name="schoolId" value={schoolId} />
          <p className="text-sm font-medium">Rattacher un élève</p>
          <input name="code" required minLength={4} maxLength={32} placeholder="Code élève" aria-label="Code élève" className={field} />
          <button type="submit" className="h-10 rounded-md border border-border px-3 text-sm">Ajouter l'élève</button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Personne</th>
              <th className="py-2 pr-3 font-medium">Rôle</th>
              <th className="py-2 pr-3 font-medium">Statut</th>
              <th className="py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rosterState === "error" ? (
              <tr>
                <td colSpan={4} className="py-2 text-muted-foreground" role="alert">Les rattachements n'ont pas pu être chargés.</td>
              </tr>
            ) : memberships.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-2 text-muted-foreground">Aucun rattachement.</td>
              </tr>
            ) : memberships.map((membership) => (
              <tr key={membership.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-3">{names[membership.user_id] ?? membership.user_id.slice(0, 8)}</td>
                <td className="py-2 pr-3">{membership.membership_role}</td>
                <td className="py-2 pr-3">{membership.status}</td>
                <td className="py-2">
                  {membership.status === "active" ? (
                    <form action={suspendMembershipAction}>
                      <input type="hidden" name="schoolId" value={schoolId} />
                      <input type="hidden" name="membershipId" value={membership.id} />
                      <button type="submit" className="text-sm underline">Suspendre</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Cours de l'école</p>
        {courseState === "error" ? (
          <p className="text-sm text-muted-foreground" role="alert">Les cours n'ont pas pu être chargés.</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun cours rattaché à cette école.</p>
        ) : null}
        {courses.map((course) => (
          <form key={course.id} action={setCoursePublishedAction} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <input type="hidden" name="schoolId" value={schoolId} />
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="published" value={course.is_published ? "0" : "1"} />
            <span className="text-sm">{course.title}</span>
            <button type="submit" className="text-sm underline">
              {course.is_published ? "Retirer de la publication" : "Publier"}
            </button>
          </form>
        ))}
      </div>
      <form action={notifySchoolAction} className="space-y-2">
        <input type="hidden" name="schoolId" value={schoolId} />
        <p className="text-sm font-medium">Avis aux enseignants</p>
        <input name="title" required minLength={2} maxLength={120} placeholder="Titre" aria-label="Titre de l'avis" className={field} />
        <textarea name="message" required minLength={2} maxLength={500} placeholder="Message" aria-label="Message de l'avis" className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button type="submit" className="h-10 rounded-md border border-border px-3 text-sm">Publier l'avis dans l'application</button>
      </form>
      <div>
        <p className="text-sm font-medium">Journal</p>
        {auditState === "error" ? (
          <p className="mt-1 text-sm text-muted-foreground" role="alert">Le journal n'a pas pu être chargé.</p>
        ) : audit.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Aucune action administrative enregistrée.</p>
        ) : null}
        <ul className="mt-2 space-y-1 text-sm">
          {audit.map((entry) => (
            <li key={entry.id} className="text-muted-foreground">
              <span className="text-foreground">{entry.action}</span> · {entry.summary} · {new Date(entry.created_at).toLocaleString("fr-FR")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
