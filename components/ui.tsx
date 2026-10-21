"use client";

/* Small building blocks shared by the module screens. */
import { useEffect, useId } from "react";
import Icon from "@/components/Icon";

import { btnDanger, btnGhost, btnPrimary, inputCls } from "@/lib/styles";
export { btnDanger, btnGhost, btnPrimary, inputCls };

/** call the app's own API; `error` is a message safe to show */
export async function api<T = unknown>(url: string, method: "GET" | "POST" | "PUT" | "DELETE", data?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method, headers: data ? { "Content-Type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
    const j = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: j as T };
    return { ok: false, error: (j as { error?: string }).error || "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: "Could not reach the server. Please try again." };
  }
}

export function Field({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block text-sm font-bold ${className}`}>
      {label}
      <div className="mt-1.5 font-normal">{children}</div>
      {hint ? <span className="mt-1 block text-xs font-normal text-black/50">{hint}</span> : null}
    </label>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7 ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id={id} className="text-xl font-extrabold">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-black/5">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return text ? (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {text}
    </p>
  ) : null;
}

const CHIP: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  unpaid: "bg-red-100 text-red-800",
  cancelled: "bg-black/10 text-black/60",
  draft: "bg-black/10 text-black/60",
};
export function StatusChip({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold capitalize ${CHIP[status] ?? CHIP.draft}`}>{status === "partial" ? "part paid" : status}</span>;
}

export function Empty({ title, note, children }: { title: string; note: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
      <p className="text-lg font-extrabold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-black/55">{note}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
