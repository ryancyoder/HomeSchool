import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your login</h1>
          <p className="mt-1 text-sm text-muted">
            You will need the family code from Mom or Dad.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <SignupForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already set up?{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
