"use client";

/* The owner gives a staff member a username and password for the attendance app (or resets them). */
import { useState } from "react";
import { ErrorNote, Field, Modal, api, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";

type Who = { _id: string; name: string; phone?: string; username?: string };

/** an easy-to-read-out password with no look-alike letters, e.g. "kdmt-4821" */
function generate(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  let w = "";
  for (let i = 0; i < 4; i++) w += letters[b[i] % letters.length];
  return `${w}-${1000 + (((b[4] << 8) | b[5]) % 9000)}`;
}

const suggestName = (s: Who) => {
  const first = s.name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const tail = (s.phone ?? "").replace(/\D/g, "").slice(-2);
  return (first + tail).slice(0, 30);
};

export default function StaffLoginForm({ who, onClose, onSaved }: { who: Who; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState(who.username ?? suggestName(who));
  const [password, setPassword] = useState(() => generate());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const link = typeof window !== "undefined" ? `${window.location.origin}/staff-login` : "/staff-login";
  const message = (u: string, p: string) => `Hi ${who.name.split(" ")[0]}, here is your Cycle Wala attendance login.\nOpen: ${link}\nUsername: ${u}\nPassword: ${p}\nCheck in when you reach the shop and check out when you leave.`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api<{ username: string }>(`/api/staff/${who._id}/login`, "PUT", { username, password });
    setBusy(false);
    if (r.ok) setMade({ username: r.data.username, password });
    else setErr(r.error);
  };
  const remove = async () => {
    if (!confirm(`Switch off ${who.name}'s login? They will be signed out and can't mark attendance until you give a new one.`)) return;
    const r = await api(`/api/staff/${who._id}/login`, "DELETE");
    if (r.ok) onSaved();
    else setErr(r.error);
  };
  const copy = async () => {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(message(made.username, made.password));
      setCopied(true);
    } catch {
      setErr("Could not copy. Select the details and copy them by hand.");
    }
  };

  if (made) {
    const d = (who.phone ?? "").replace(/\D/g, "");
    const wa = `https://wa.me/${d ? (d.length === 10 ? "91" + d : d) : ""}?text=${encodeURIComponent(message(made.username, made.password))}`;
    return (
      <Modal title={`Login ready for ${who.name}`} onClose={onSaved}>
        <div className="space-y-4">
          <p className="text-sm text-black/60">Give these to {who.name.split(" ")[0]}. The password is shown only now — you can always set a new one.</p>
          <div className="space-y-2 rounded-2xl bg-[#0a0a0c] p-5 text-white">
            <Row k="Open" v={link} />
            <Row k="Username" v={made.username} big />
            <Row k="Password" v={made.password} big />
          </div>
          <ErrorNote text={err} />
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary} onClick={copy}>
              {copied ? "Copied ✓" : "Copy details"}
            </button>
            <a className={btnGhost} href={wa} target="_blank" rel="noreferrer">
              Send on WhatsApp
            </a>
            <button className={btnGhost} onClick={onSaved}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={who.username ? `Reset login for ${who.name}` : `Give ${who.name} a login`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-black/60">With this they sign in on their own phone, check in and out, and see their own month. They cannot see anything else in the app.</p>
        <Field label="Username" hint="Letters and numbers, no spaces.">
          <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" spellCheck={false} required />
        </Field>
        <Field label={who.username ? "New password" : "Password"} hint="At least 6 characters. They can change it later.">
          <div className="flex gap-2">
            <input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} spellCheck={false} required />
            <button type="button" className={btnGhost} onClick={() => setPassword(generate())}>
              New
            </button>
          </div>
        </Field>
        <ErrorNote text={err} />
        <div className="flex flex-wrap items-center gap-3">
          <button className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : who.username ? "Set new password" : "Create login"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          {who.username ? (
            <button type="button" className={`${btnDanger} ml-auto`} onClick={remove}>
              Switch off login
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

function Row({ k, v, big = false }: { k: string; v: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs font-bold uppercase tracking-wider text-white/45">{k}</span>
      <span className={`break-all text-right font-mono ${big ? "text-xl font-extrabold text-[#67DD25]" : "text-sm text-white/80"}`}>{v}</span>
    </div>
  );
}
