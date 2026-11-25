"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";

type ClassOption = { id: string; name: string; students: { membershipId: string; name: string }[] };

export function AttendanceForm({
  classes,
  action,
}: {
  classes: ClassOption[];
  action: (input: { classId: string; membershipId: string; sessionDate: string; status: string; notes?: string }) => Promise<{ ok: boolean; message: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const students = classes.find((item) => item.id === classId)?.students ?? [];
  const [membershipId, setMembershipId] = useState(students[0]?.membershipId ?? "");
  const [sessionDate, setSessionDate] = useState("");
  const [status, setStatus] = useState("present");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const currentStudents = classes.find((item) => item.id === classId)?.students ?? [];
  const selectedMembership = currentStudents.some((student) => student.membershipId === membershipId)
    ? membershipId
    : currentStudents[0]?.membershipId ?? "";

  return (
    <form
      className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await action({ classId, membershipId: selectedMembership, sessionDate, status, notes });
          setMessage(result.message);
          if (result.ok) router.refresh();
        });
      }}
    >
      <div>
        <Label>Classe</Label>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Élève</Label>
        <Select value={selectedMembership} onValueChange={setMembershipId}>
          <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
          <SelectContent>
            {currentStudents.map((student) => <SelectItem key={student.membershipId} value={student.membershipId}>{student.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Jour scolaire</Label>
        <Input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} required />
      </div>
      <div>
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="present">Présent</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="late">En retard</SelectItem>
            <SelectItem value="excused">Excusé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Note</Label>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !selectedMembership || !sessionDate}>Enregistrer</Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
