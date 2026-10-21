import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import { PHASES, SECTIONS, bySlug } from "@/lib/nav";

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[section]">) {
  const { section } = await params;
  const s = bySlug(section);
  return { title: s ? `${s.label} — Cycle Wala Billing` : "Cycle Wala Billing" };
}

/* Each module's page. They are filled in one by one — see docs/ROADMAP.md. */
export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const { section } = await params;
  const s = bySlug(section);
  if (!s) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4CAF2E] text-white">
          <Icon name={s.icon} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{s.label}</h1>
          <p className="text-black/60">{s.blurb}</p>
        </div>
        <span className="ml-auto rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60">{PHASES[s.phase]}</span>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#3c8a24]">Coming next</p>
        <h2 className="mt-1 text-xl font-extrabold">What this section will do</h2>
        <ul className="mt-5 space-y-3">
          {s.features.map((f) => (
            <li key={f} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#4CAF2E]/15 text-[#3c8a24]">
                <Icon name="check" className="h-3.5 w-3.5" />
              </span>
              <span className="text-[15px]">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
