import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./index";

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) redirect("/auth/signin");
  return session.user;
}
