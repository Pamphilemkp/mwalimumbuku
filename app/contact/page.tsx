import type { Metadata } from "next";
import { ContactPage } from "@/features/public/contact-form";

export const metadata: Metadata = {
  title: "Contact — Mwalimu Mbuku",
  description: "Écrire à l'équipe de Mwalimu Mbuku. Le formulaire n'inscrit pas une école et ne crée pas de compte.",
};

export default function Page() {
  return <ContactPage />;
}
