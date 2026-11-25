import type { Metadata } from "next";
import { InfoPage } from "@/features/public/info-page";

export const metadata: Metadata = {
  title: "Enseignants et écoles — Mwalimu Mbuku",
  description: "Les écoles sont créées par un administrateur de la plateforme. Les enseignants ne s'inscrivent pas depuis le site public.",
};

export default function Page() {
  return <InfoPage pageKey="schoolsPage" />;
}
