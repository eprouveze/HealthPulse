import { NextResponse } from "next/server";
import {
  findMilestones,
  analyzeTrends,
  findHistoricalComparisons,
  generateInsights,
} from "@/lib/analysis";
import { db } from "@/lib/db";
import { weights, goals } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Get latest weight
    const latestWeight = await db
      .select()
      .from(weights)
      .orderBy(desc(weights.date))
      .limit(1);

    if (!latestWeight[0]) {
      return NextResponse.json({ error: "No weight data" }, { status: 404 });
    }

    const currentWeight = latestWeight[0].weightKg;

    // Get active goal
    const activeGoal = await db
      .select()
      .from(goals)
      .where(eq(goals.isActive, true))
      .orderBy(desc(goals.createdAt))
      .limit(1);

    const goalWeight = activeGoal[0]?.targetWeight;

    // Run analysis in parallel
    const [milestones, trends, historicalComparisons, insights] = await Promise.all([
      findMilestones(currentWeight),
      analyzeTrends(currentWeight, goalWeight),
      findHistoricalComparisons(currentWeight),
      generateInsights(),
    ]);

    return NextResponse.json({
      currentWeight,
      goalWeight,
      milestones,
      trends,
      historicalComparisons,
      insights,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
