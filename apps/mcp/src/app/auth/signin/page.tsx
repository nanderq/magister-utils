import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/google-sign-in";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/dashboard");
  return <main className="auth-wrap"><section className="auth-card">
    <h1>Sign in securely.</h1>
    <p>Use your Google account to access the dashboard.</p>
    <GoogleSignIn />
  </section></main>;
}
