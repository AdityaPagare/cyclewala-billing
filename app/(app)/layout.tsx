import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { isSignedIn } from "@/lib/auth";

/* Everything inside (app) needs a signed-in owner. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await isSignedIn())) redirect("/login");
  return <AppShell shopName="Cycle Wala">{children}</AppShell>;
}
