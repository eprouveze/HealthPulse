import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { restingHeartRate } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const hr = await db
      .select()
      .from(restingHeartRate)
      .orderBy(desc(restingHeartRate.date));

    return NextResponse.json(hr);
  } catch (error) {
    console.error("Failed to fetch resting heart rate:", error);
    return NextResponse.json({ error: "Failed to fetch resting heart rate" }, { status: 500 });
  }
}
