import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weights } from "@/lib/schema";
import { desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    // Get all weights, one per day (latest if multiple), ordered by date desc
    const allWeights = await db
      .select()
      .from(weights)
      .orderBy(desc(weights.date));

    return NextResponse.json(allWeights);
  } catch (error) {
    console.error("Failed to fetch weights:", error);
    return NextResponse.json({ error: "Failed to fetch weights" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, weightKg, source = "manual" } = body;

    if (!date || !weightKg) {
      return NextResponse.json({ error: "date and weightKg are required" }, { status: 400 });
    }

    const newWeight = await db
      .insert(weights)
      .values({
        date,
        weightKg: parseFloat(weightKg),
        source,
      })
      .returning();

    return NextResponse.json(newWeight[0]);
  } catch (error) {
    console.error("Failed to add weight:", error);
    return NextResponse.json({ error: "Failed to add weight" }, { status: 500 });
  }
}
