import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workouts } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allWorkouts = await db
      .select()
      .from(workouts)
      .orderBy(desc(workouts.date));

    return NextResponse.json(allWorkouts);
  } catch (error) {
    console.error("Failed to fetch workouts:", error);
    return NextResponse.json({ error: "Failed to fetch workouts" }, { status: 500 });
  }
}
