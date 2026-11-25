import type { Metadata } from "next";
import { MissionPage } from "@/features/landing/mission-page";

export const metadata: Metadata = {
  title: "Notre Mission — Mwalimu Mbuku",
  description: "Un soutien scolaire adapté à chaque enfant.",
};

export default function Page() {
  return <MissionPage />;
}
