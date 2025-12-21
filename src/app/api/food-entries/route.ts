import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries, nutritionSprints } from "@/lib/schema";
import { desc, eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get("sprintId");
    const date = searchParams.get("date");

    let query = db.select().from(foodEntries);

    if (sprintId) {
      const entries = await db
        .select()
        .from(foodEntries)
        .where(eq(foodEntries.sprintId, parseInt(sprintId)))
        .orderBy(desc(foodEntries.date), desc(foodEntries.time));

      // Group by date and calculate totals
      const byDate: Record<string, { entries: typeof entries; totalCalories: number; totalProtein: number }> = {};
      for (const entry of entries) {
        if (!byDate[entry.date]) {
          byDate[entry.date] = { entries: [], totalCalories: 0, totalProtein: 0 };
        }
        byDate[entry.date].entries.push(entry);
        byDate[entry.date].totalCalories += entry.calories;
        byDate[entry.date].totalProtein += entry.proteinG || 0;
      }

      return NextResponse.json({ entries, byDate });
    }

    if (date) {
      const entries = await db
        .select()
        .from(foodEntries)
        .where(eq(foodEntries.date, date))
        .orderBy(desc(foodEntries.time));

      const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
      const totalProtein = entries.reduce((sum, e) => sum + (e.proteinG || 0), 0);

      return NextResponse.json({ entries, totalCalories, totalProtein });
    }

    // Return all entries grouped by date for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const entries = await db
      .select()
      .from(foodEntries)
      .where(sql`${foodEntries.date} >= ${thirtyDaysAgo}`)
      .orderBy(desc(foodEntries.date), desc(foodEntries.time));

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to fetch food entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sprintId, date, time, item, calories, proteinG, aiEstimated } = body;

    if (!sprintId || !date || !time || !item || calories === undefined) {
      return NextResponse.json(
        { error: "sprintId, date, time, item, and calories are required" },
        { status: 400 }
      );
    }

    // Verify sprint exists and is active
    const sprint = await db
      .select()
      .from(nutritionSprints)
      .where(eq(nutritionSprints.id, sprintId))
      .limit(1);

    if (!sprint[0] || !sprint[0].isActive) {
      return NextResponse.json(
        { error: "No active sprint found" },
        { status: 400 }
      );
    }

    const newEntry = await db
      .insert(foodEntries)
      .values({
        sprintId,
        date,
        time,
        item,
        calories: parseFloat(calories),
        proteinG: proteinG ? parseFloat(proteinG) : null,
        aiEstimated: aiEstimated || false,
      })
      .returning();

    // Get updated totals for the day
    const dayEntries = await db
      .select()
      .from(foodEntries)
      .where(and(eq(foodEntries.sprintId, sprintId), eq(foodEntries.date, date)));

    const totalCalories = dayEntries.reduce((sum, e) => sum + e.calories, 0);
    const totalProtein = dayEntries.reduce((sum, e) => sum + (e.proteinG || 0), 0);

    return NextResponse.json({
      entry: newEntry[0],
      dayTotal: { totalCalories, totalProtein, entryCount: dayEntries.length },
    });
  } catch (error) {
    console.error("Failed to add food entry:", error);
    return NextResponse.json({ error: "Failed to add entry" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.delete(foodEntries).where(eq(foodEntries.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete food entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
