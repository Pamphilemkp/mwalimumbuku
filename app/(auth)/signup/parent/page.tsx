import type { Metadata } from "next";
import { RegisterForm } from "@/features/public/register-form";

export const metadata: Metadata = {
  title: "Inscription parent — Mwalimu Mbuku",
  description: "Créer un compte parent. Le rôle est fixé par cette page et vérifié sur le serveur.",
};

export default function Page() {
  return <RegisterForm role="parent" />;
}
