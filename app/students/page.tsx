import type { Metadata } from "next";
import { InfoPage } from "@/features/public/info-page";

export const metadata: Metadata = {
  title: "Élèves — Mwalimu Mbuku",
  description: "L'inscription élève crée un compte élève. Les cours, devoirs, jeux et réussites affichés viennent des données de ce compte.",
};

export default function Page() {
  return <InfoPage pageKey="studentsPage" />;
}
