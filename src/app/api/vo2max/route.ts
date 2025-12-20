import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vo2max } from "@/lib/schema";
import { desc, gte } from "drizzle-orm";

interface VO2MaxStats {
  current: { date: string; vo2max: number } | null;
  prev30: { vo2max: number } | null;
  history: { date: string; vo2max: number }[];
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get all VO2Max data from the last year
    const allData = await db
      .select()
      .from(vo2max)
      .where(gte(vo2max.date, oneYearAgo))
      .orderBy(desc(vo2max.date));

    if (allData.length === 0) {
      return NextResponse.json({
        current: null,
        prev30: null,
        history: [],
      } as VO2MaxStats);
    }

    // Current is the most recent reading
    const current = {
      date: allData[0].date,
      vo2max: allData[0].vo2max,
    };

    // Find reading from ~30 days ago for comparison
    const prev30Data = allData.find(d => d.date <= thirtyDaysAgo);
    const prev30 = prev30Data ? { vo2max: prev30Data.vo2max } : null;

    // Format history
    const history = allData.map(d => ({
      date: d.date,
      vo2max: d.vo2max,
    }));

    return NextResponse.json({
      current,
      prev30,
      history,
    } as VO2MaxStats);
  } catch (error) {
    console.error("Failed to fetch VO2Max stats:", error);
    return NextResponse.json({ error: "Failed to fetch VO2Max stats" }, { status: 500 });
  }
}
