import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailySteps } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const steps = await db
      .select()
      .from(dailySteps)
      .orderBy(desc(dailySteps.date));

    return NextResponse.json(steps);
  } catch (error) {
    console.error("Failed to fetch steps:", error);
    return NextResponse.json({ error: "Failed to fetch steps" }, { status: 500 });
  }
}
