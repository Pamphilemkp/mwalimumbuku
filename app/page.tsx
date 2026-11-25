import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { APP_ROLES, authorize } from "@/lib/auth/access";
import { loadAppSession } from "@/services/auth/session";

export const metadata: Metadata = {
  title: "Mwalimu Mbuku",
  description: "Learning for students, parents, and teachers in the Democratic Republic of Congo.",
};

async function accountLink(): Promise<{ href: string; label: string }> {
  try {
    const session = await loadAppSession();
    if (!session.hasSession) return { href: "/login", label: "Sign in" };
    const decision = authorize({
      hasSession: true,
      resolution: session.resolution,
      allowedRoles: APP_ROLES,
    });
    if (decision === "allow") return { href: "/dashboard", label: "Your dashboard" };
    return { href: "/holding", label: "Account status" };
  } catch {
    return { href: "/login", label: "Sign in" };
  }
}

const AUDIENCES = [
  {
    title: "Students",
    body: "Lessons, exercises, and practice that can follow a student's own pace.",
  },
  {
    title: "Parents",
    body: "A place to follow a child's learning and stay in touch with the school.",
  },
  {
    title: "Teachers",
    body: "Courses, exercises, and feedback for the class.",
  },
] as const;

export default async function HomePage() {
  const account = await accountLink();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
            <span className="text-base font-semibold">Mwalimu Mbuku</span>
          </Link>
          <Link
            href={account.href}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {account.label}
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
          <p className="text-sm font-medium text-primary">Education for every learner</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Learn without limits
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            A learning platform for students, parents, and teachers in the Democratic Republic of Congo,
            built for ordinary schools and for children who need a different pace.
          </p>
          <div className="mt-8">
            <Link
              href={account.href}
              className="inline-flex rounded-md bg-primary px-5 py-2.5 text-base font-medium text-primary-foreground"
            >
              {account.label}
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:grid-cols-3">
            {AUDIENCES.map((item) => (
              <div key={item.title}>
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className="text-2xl font-semibold tracking-tight">Support that fits the child</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Some children need a different rhythm, clearer steps, and more than one way to learn.
            Mwalimu Mbuku is for those classrooms and families: lighter pages for slow connections,
            and a path that does not leave a child behind.
          </p>
        </section>
      </main>
    </div>
  );
}
