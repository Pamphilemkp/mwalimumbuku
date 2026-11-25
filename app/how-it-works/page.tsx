import type { Metadata } from "next";
import { InfoPage } from "@/features/public/info-page";

export const metadata: Metadata = {
  title: "Comment ça marche — Mwalimu Mbuku",
  description: "Créer un compte élève ou parent, confirmer l'adresse, puis utiliser les cours et les données que l'école a réellement enregistrés.",
};

export default function Page() {
  return <InfoPage pageKey="howPage" />;
}
