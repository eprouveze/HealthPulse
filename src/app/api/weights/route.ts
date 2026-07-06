import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weights } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";

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
    return NextResponse.json(
      { error: "Failed to fetch weights" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, weightKg, source = "manual" } = body;

    if (!date || !weightKg) {
      return NextResponse.json(
        { error: "date and weightKg are required" },
        { status: 400 },
      );
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
    return NextResponse.json(
      { error: "Failed to add weight" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(weights)
      .where(eq(weights.id, parseInt(id)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Weight not found" }, { status: 404 });
    }

    const body = await request.json();
    const { date, weightKg, source } = body;

    await db
      .update(weights)
      .set({
        date: date ?? existing[0].date,
        weightKg:
          weightKg !== undefined ? parseFloat(weightKg) : existing[0].weightKg,
        source: source ?? existing[0].source,
      })
      .where(eq(weights.id, parseInt(id)));

    const updated = await db
      .select()
      .from(weights)
      .where(eq(weights.id, parseInt(id)))
      .limit(1);
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Failed to update weight:", error);
    return NextResponse.json(
      { error: "Failed to update weight" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(weights)
      .where(eq(weights.id, parseInt(id)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Weight not found" }, { status: 404 });
    }

    await db.delete(weights).where(eq(weights.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete weight:", error);
    return NextResponse.json(
      { error: "Failed to delete weight" },
      { status: 500 },
    );
  }
}
