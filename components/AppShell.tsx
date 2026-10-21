"use client";

/* The signed-in frame: sidebar (a drawer on phones), top bar and sign-out. */
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { SECTIONS, type Phase } from "@/lib/nav";

const GROUPS: { title: string; phases: Phase[] }[] = [
  { title: "Billing", phases: [1] },
  { title: "Team", phases: [2] },
  { title: "More", phases: [3] },
];

export default function AppShell({ shopName, children }: { shopName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const link = (href: string, label: string, icon: string) => {
    const on = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition ${
          on ? "bg-[#4CAF2E] text-white shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon name={icon} className="h-5 w-5 shrink-0" />
        {label}
      </Link>
    );
  };

  const nav = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 pb-6">
      {link("/dashboard", "Dashboard", "home")}
      {GROUPS.map((g) => (
        <div key={g.title} className="mt-5">
          <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{g.title}</p>
          {SECTIONS.filter((s) => g.phases.includes(s.phase)).map((s) => link(`/${s.slug}`, s.label, s.icon))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f2] text-[#0a0a0c]">
      {/* desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0a0a0c] lg:flex">
        <div className="px-5 py-6">
          <Image src="/images/logo-wordmark.png" alt="Cycle Wala" width={170} height={37} priority className="h-auto w-[150px]" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#67DD25]">Billing &amp; Staff</p>
        </div>
        {nav}
      </aside>

      {/* phone drawer */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/55" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#0a0a0c]">
            <div className="flex items-center justify-between px-5 py-5">
              <Image src="/images/logo-wordmark.png" alt="Cycle Wala" width={150} height={33} className="h-auto w-[130px]" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-white/80 hover:bg-white/10">
                <Icon name="x" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="lg:pl-64 print:pl-0">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-black/5 bg-white/85 px-4 py-3 backdrop-blur sm:px-8">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-black/5 lg:hidden">
            <Icon name="menu" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{shopName}</p>
            <p className="text-xs text-black/50">Owner account</p>
          </div>
          <Link href="/invoices/new" className="hidden items-center gap-2 rounded-full bg-[#4CAF2E] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#3c8a24] sm:flex">
            <Icon name="plus" className="h-4 w-4" />
            New invoice
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5">
            <Icon name="out" className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}

