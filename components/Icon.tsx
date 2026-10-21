/* Small line icons for the sidebar and cards (24px grid, drawn with strokes). */
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M17 14.5c2.4.2 4 1.8 4.5 4.5" />
    </>
  ),
  box: <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9" />,
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" />,
  rupee: <path d="M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l7 6" />,
  badge: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.7-4.2 3.6-6.5 8-6.5s7.3 2.3 8 6.5" />
    </>
  ),
  calendar: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14l2.5 2.5L16 12" />,
  wallet: <path d="M3 7h15a3 3 0 013 3v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l11-3v3M16 14h3" />,
  file: <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />,
  truck: <path d="M2 6h11v10H2zM13 9h5l3 3v4h-8zM6 19a1.7 1.7 0 100-.01M17 19a1.7 1.7 0 100-.01" />,
  chart: <path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  out: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
};

export default function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name] ?? PATHS.file}
    </svg>
  );
}
