import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bodyComposition } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db
      .select()
      .from(bodyComposition)
      .orderBy(desc(bodyComposition.date))
      .limit(365);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch body composition:", error);
    return NextResponse.json({ error: "Failed to fetch body composition" }, { status: 500 });
  }
}
