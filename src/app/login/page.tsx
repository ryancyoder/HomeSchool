import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Yoder Home School
          </h1>
          <p className="mt-1 text-sm text-muted">2026&ndash;2027 school year</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <Suspense fallback={<p className="text-sm text-muted">Loading&hellip;</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          First time here?{" "}
          <Link href="/signup" className="font-medium underline underline-offset-4">
            Set up your login
          </Link>
        </p>
      </div>
    </main>
  );
}
