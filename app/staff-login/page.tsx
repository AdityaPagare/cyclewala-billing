import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/staff-auth";
import StaffLoginForm from "./StaffLoginForm";

export const metadata: Metadata = { title: "Staff sign in — Cycle Wala", robots: { index: false, follow: false } };

export default async function StaffLoginPage() {
  if (await currentStaff()) redirect("/me");
  return <StaffLoginForm />;
}
