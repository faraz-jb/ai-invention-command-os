import { redirect } from "next/navigation";
import { adminExists } from "@/lib/auth";
import SetupForm from "@/components/SetupForm";

export default async function SetupPage() {
  if (adminExists()) redirect("/login");
  return <SetupForm />;
}
