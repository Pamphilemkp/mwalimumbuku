import type { Metadata } from "next";
import { RegisterForm } from "@/features/public/register-form";

export const metadata: Metadata = {
  title: "Inscription élève — Mwalimu Mbuku",
  description: "Créer un compte élève. Le rôle est fixé par cette page et vérifié sur le serveur.",
};

export default function Page() {
  return <RegisterForm role="student" />;
}
