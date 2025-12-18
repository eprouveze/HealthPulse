import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailySleep } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const sleep = await db
      .select()
      .from(dailySleep)
      .orderBy(desc(dailySleep.date));

    return NextResponse.json(sleep);
  } catch (error) {
    console.error("Failed to fetch sleep data:", error);
    return NextResponse.json({ error: "Failed to fetch sleep data" }, { status: 500 });
  }
}
