"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnGhost, btnPrimary } from "@/components/ui";
import { inr } from "@/lib/format";
import { ReceiveForm } from "../PartiesView";

export default function LedgerActions({ party }: { party: { _id: string; name: string; phone: string; balance: number } }) {
  const router = useRouter();
  const [pay, setPay] = useState(false);
  const digits = party.phone.replace(/\D/g, "");
  const wa = digits
    ? `https://wa.me/${digits.length === 10 ? "91" + digits : digits}?text=${encodeURIComponent(`Hi ${party.name}, a gentle reminder: ${inr(party.balance)} is pending at Cycle Wala. Thank you!`)}`
    : "";
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={`/invoices/new?party=${party._id}`} className={btnPrimary}>
        New invoice
      </Link>
      <button className={btnGhost} onClick={() => setPay(true)}>
        Receive payment
      </button>
      {party.balance > 0 && wa ? (
        <a className={btnGhost} href={wa} target="_blank" rel="noreferrer">
          WhatsApp reminder
        </a>
      ) : null}
      {pay ? <ReceiveForm party={party} onClose={() => setPay(false)} onSaved={() => { setPay(false); router.refresh(); }} /> : null}
    </div>
  );
}
