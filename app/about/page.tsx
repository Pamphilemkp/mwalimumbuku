import type { Metadata } from "next";
import { InfoPage } from "@/features/public/info-page";

export const metadata: Metadata = {
  title: "À propos — Mwalimu Mbuku",
  description: "Mwalimu Mbuku est une plateforme d'apprentissage pour les élèves, les parents, les enseignants et les écoles.",
};

export default function Page() {
  return <InfoPage pageKey="aboutPage" />;
}
