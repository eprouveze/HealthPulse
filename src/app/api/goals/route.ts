import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { goals } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const allGoals = await db
      .select()
      .from(goals)
      .orderBy(desc(goals.createdAt));

    return NextResponse.json(allGoals);
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetWeight, targetDate } = body;

    if (!targetWeight) {
      return NextResponse.json({ error: "targetWeight is required" }, { status: 400 });
    }

    // Deactivate existing goals
    await db.update(goals).set({ isActive: false }).where(eq(goals.isActive, true));

    // Create new goal
    const newGoal = await db
      .insert(goals)
      .values({
        targetWeight: parseFloat(targetWeight),
        targetDate: targetDate || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newGoal[0]);
  } catch (error) {
    console.error("Failed to create goal:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
