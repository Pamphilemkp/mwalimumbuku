import type { Metadata } from "next";
import { InfoPage } from "@/features/public/info-page";

export const metadata: Metadata = {
  title: "Parents — Mwalimu Mbuku",
  description: "L'inscription parent crée un compte parent. Les enfants, notes et présences affichés sont ceux qui sont réellement liés.",
};

export default function Page() {
  return <InfoPage pageKey="parentsPage" />;
}
