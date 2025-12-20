import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { heartRateVariability } from "@/lib/schema";
import { desc, gte, sql } from "drizzle-orm";

export async function GET() {
  try {
    // Get last 90 days of HRV data
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString().split("T")[0];

    const hrvData = await db
      .select()
      .from(heartRateVariability)
      .where(gte(heartRateVariability.date, cutoffDate))
      .orderBy(desc(heartRateVariability.date));

    if (hrvData.length === 0) {
      return NextResponse.json({
        current7DayAvg: null,
        prev7DayAvg: null,
        trend: "no_data",
        weeklyAverages: [],
        latestReading: null,
      });
    }

    // Calculate current 7-day average (most recent 7 days)
    const last7Days = hrvData.slice(0, 7);
    const current7DayAvg =
      last7Days.length > 0
        ? last7Days.reduce((sum, d) => sum + d.hrvSdnnMs, 0) / last7Days.length
        : null;

    // Calculate previous 7-day average (days 8-14)
    const prev7Days = hrvData.slice(7, 14);
    const prev7DayAvg =
      prev7Days.length > 0
        ? prev7Days.reduce((sum, d) => sum + d.hrvSdnnMs, 0) / prev7Days.length
        : null;

    // Determine trend
    let trend = "stable";
    if (current7DayAvg !== null && prev7DayAvg !== null) {
      const change = ((current7DayAvg - prev7DayAvg) / prev7DayAvg) * 100;
      if (change > 5) {
        trend = "improving";
      } else if (change < -5) {
        trend = "declining";
      }
    }

    // Calculate weekly averages for pattern detection
    const weeklyAverages: Array<{ weekStart: string; avgHrv: number }> = [];
    const sortedData = [...hrvData].reverse(); // Sort chronologically

    for (let i = 0; i < sortedData.length; i += 7) {
      const weekData = sortedData.slice(i, i + 7);
      if (weekData.length > 0) {
        const avgHrv = weekData.reduce((sum, d) => sum + d.hrvSdnnMs, 0) / weekData.length;
        weeklyAverages.push({
          weekStart: weekData[0].date,
          avgHrv: Math.round(avgHrv * 10) / 10, // Round to 1 decimal
        });
      }
    }

    // Get latest reading
    const latestReading = hrvData[0]
      ? {
          date: hrvData[0].date,
          hrvSdnnMs: hrvData[0].hrvSdnnMs,
        }
      : null;

    return NextResponse.json({
      current7DayAvg: current7DayAvg !== null ? Math.round(current7DayAvg * 10) / 10 : null,
      prev7DayAvg: prev7DayAvg !== null ? Math.round(prev7DayAvg * 10) / 10 : null,
      trend,
      weeklyAverages: weeklyAverages.reverse(), // Most recent first
      latestReading,
    });
  } catch (error) {
    console.error("Failed to fetch HRV data:", error);
    return NextResponse.json({ error: "Failed to fetch HRV data" }, { status: 500 });
  }
}
