import type { Metadata } from "next";
import { HomePage } from "@/features/landing/home-page";

export const metadata: Metadata = {
  title: "Mwalimu Mbuku",
  description:
    "Une plateforme d'apprentissage accessible et ludique conçue pour les élèves, parents et enseignants en Afrique.",
};

export default function Page() {
  return <HomePage />;
}
