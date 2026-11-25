import type { Metadata } from "next";
import { SignupChooser } from "@/features/public/register-form";

export const metadata: Metadata = {
  title: "Créer un compte — Mwalimu Mbuku",
  description: "Créer un compte élève ou un compte parent. Les comptes enseignant et administrateur sont ouverts par une personne autorisée.",
};

export default function Page() {
  return <SignupChooser />;
}
