import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nutritionSprints } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Get active sprint first, then recent sprints
    const sprints = await db
      .select()
      .from(nutritionSprints)
      .orderBy(desc(nutritionSprints.startDate));

    // Find active sprint and calculate current day
    const activeSprint = sprints.find(s => s.isActive);
    if (activeSprint) {
      const startDate = new Date(activeSprint.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      const currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Check if sprint has ended
      if (currentDay > activeSprint.durationDays) {
        // Mark sprint as inactive
        await db
          .update(nutritionSprints)
          .set({ isActive: false })
          .where(eq(nutritionSprints.id, activeSprint.id));
        activeSprint.isActive = false;
      }

      return NextResponse.json({
        activeSprint: activeSprint.isActive ? { ...activeSprint, currentDay } : null,
        recentSprints: sprints,
      });
    }

    return NextResponse.json({
      activeSprint: null,
      recentSprints: sprints,
    });
  } catch (error) {
    console.error("Failed to fetch nutrition sprints:", error);
    return NextResponse.json({ error: "Failed to fetch sprints" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { durationDays } = body;

    if (!durationDays || ![10, 14, 20].includes(durationDays)) {
      return NextResponse.json(
        { error: "durationDays must be 10, 14, or 20" },
        { status: 400 }
      );
    }

    // Deactivate any existing active sprints
    await db
      .update(nutritionSprints)
      .set({ isActive: false })
      .where(eq(nutritionSprints.isActive, true));

    // Calculate dates
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const newSprint = await db
      .insert(nutritionSprints)
      .values({
        startDate,
        endDate,
        durationDays,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ ...newSprint[0], currentDay: 1 });
  } catch (error) {
    console.error("Failed to create sprint:", error);
    return NextResponse.json({ error: "Failed to create sprint" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db
      .update(nutritionSprints)
      .set({ isActive: false })
      .where(eq(nutritionSprints.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to end sprint:", error);
    return NextResponse.json({ error: "Failed to end sprint" }, { status: 500 });
  }
}
