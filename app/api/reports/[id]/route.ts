import { NextRequest, NextResponse } from "next/server";
import { bad, deny } from "@/lib/guard";
import { today } from "@/lib/format";
import { buildReport, rangeOf, reportCsv } from "@/lib/reports";

export const dynamic = "force-dynamic";

/** a report as a CSV file (opens in Excel / Google Sheets) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  const q = req.nextUrl.searchParams;
  const { id } = await params;
  const range = rangeOf({ from: q.get("from") ?? undefined, to: q.get("to") ?? undefined, month: q.get("month") ?? undefined }, today());
  const r = await buildReport(id, range);
  if (!r) return bad("Unknown report.", 404);
  const name = `cyclewala-${id}-${r.scope === "now" ? today() : `${range.from}_to_${range.to}`}.csv`;
  return new NextResponse(reportCsv(r), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
