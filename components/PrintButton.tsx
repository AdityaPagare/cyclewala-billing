"use client";

export default function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="rounded-full bg-[#4CAF2E] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#3c8a24]">
      {label}
    </button>
  );
}
