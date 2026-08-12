export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { adminExists } from "@/lib/auth";
import { isAuthed } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  if (!adminExists()) redirect("/setup");
  if (await isAuthed()) redirect("/");
  return <LoginForm />;
}
