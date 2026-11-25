import type { Metadata } from "next";
import Signup from "@/src/screens/Signup";

export const metadata: Metadata = {
  title: "Créer un compte — Mwalimu Mbuku",
};

export default function SignupPage() {
  return <Signup />;
}
