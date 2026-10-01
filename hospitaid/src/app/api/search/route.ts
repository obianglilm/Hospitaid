import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const results = await searchCatalog(q);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { results: [], error: e instanceof Error ? e.message : "Erreur de recherche" },
      { status: 500 }
    );
  }
}
