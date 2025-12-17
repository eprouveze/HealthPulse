import { NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Ensure settings table exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Key parameter required" }, { status: 400 });
  }

  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

  if (result.length === 0) {
    return NextResponse.json({ value: null });
  }

  return NextResponse.json({ value: result[0].value });
}

export async function POST(request: Request) {
  const { key, value } = await request.json();

  if (!key) {
    return NextResponse.json({ error: "Key required" }, { status: 400 });
  }

  if (value === null || value === undefined || value === "") {
    // Delete the setting
    await db.delete(settings).where(eq(settings.key, key));
    return NextResponse.json({ success: true, deleted: true });
  }

  // Upsert the setting
  await db.insert(settings)
    .values({ key, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date().toISOString() },
    });

  return NextResponse.json({ success: true });
}
