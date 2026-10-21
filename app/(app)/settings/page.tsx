import { mailConfigured } from "@/lib/mail";
import { getBusiness } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export const metadata = { title: "Settings — Cycle Wala Billing" };

export default async function SettingsPage() {
  const biz = await getBusiness();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-black/60">Shop profile, invoice numbering and how invoices are sent.</p>
      </div>
      <SettingsForm biz={biz} mailReady={mailConfigured()} />
    </div>
  );
}
