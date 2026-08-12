import { redirect } from "next/navigation";
import { adminExists } from "@/lib/auth";
import { isAuthed } from "@/lib/session";
import Nav from "@/components/Nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!adminExists()) redirect("/setup");
  if (!(await isAuthed())) redirect("/login");

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
