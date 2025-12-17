import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weights, goals } from "@/lib/schema";
import { desc, asc, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Get latest weight
    const latestWeight = await db
      .select()
      .from(weights)
      .orderBy(desc(weights.date))
      .limit(1);

    // Get earliest weight
    const earliestWeight = await db
      .select()
      .from(weights)
      .orderBy(asc(weights.date))
      .limit(1);

    // Get active goal
    const activeGoal = await db
      .select()
      .from(goals)
      .where(eq(goals.isActive, true))
      .orderBy(desc(goals.createdAt))
      .limit(1);

    // Get weight from 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const weekAgoWeight = await db
      .select()
      .from(weights)
      .where(eq(weights.date, weekAgoStr))
      .limit(1);

    // Get weight from 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const monthAgoWeight = await db
      .select()
      .from(weights)
      .where(eq(weights.date, monthAgoStr))
      .limit(1);

    const current = latestWeight[0]?.weightKg || 0;
    const starting = earliestWeight[0]?.weightKg || current;
    const goal = activeGoal[0]?.targetWeight;

    return NextResponse.json({
      current,
      starting,
      goal,
      totalLost: starting - current,
      weekChange: weekAgoWeight[0] ? current - weekAgoWeight[0].weightKg : null,
      monthChange: monthAgoWeight[0] ? current - monthAgoWeight[0].weightKg : null,
      toGoal: goal ? current - goal : null,
      latestDate: latestWeight[0]?.date,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
