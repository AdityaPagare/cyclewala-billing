import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { currentStaff } from "@/lib/staff-auth";

/* the owner goes to the dashboard, a signed-in staff member to their own screen */
export default async function Home() {
  if (await isSignedIn()) redirect("/dashboard");
  if (await currentStaff()) redirect("/me");
  redirect("/login");
}
