import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const allEntries = await db.select().from(entries).orderBy(desc(entries.date));
    return NextResponse.json(allEntries);
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, notes, energyLevel, fastingHours } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    // Upsert - update if exists, insert if not
    const existing = await db.select().from(entries).where(eq(entries.date, date)).limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(entries)
        .set({
          notes: notes ?? existing[0].notes,
          energyLevel: energyLevel ?? existing[0].energyLevel,
          fastingHours: fastingHours ?? existing[0].fastingHours,
        })
        .where(eq(entries.date, date));

      const updated = await db.select().from(entries).where(eq(entries.date, date)).limit(1);
      return NextResponse.json(updated[0]);
    } else {
      // Insert new
      const newEntry = await db
        .insert(entries)
        .values({
          date,
          notes: notes || null,
          energyLevel: energyLevel || null,
          fastingHours: fastingHours || null,
        })
        .returning();

      return NextResponse.json(newEntry[0]);
    }
  } catch (error) {
    console.error("Failed to save entry:", error);
    return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
  }
}
