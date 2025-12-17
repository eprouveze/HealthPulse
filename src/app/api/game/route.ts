import { NextResponse } from "next/server";
import { getGameState } from "@/lib/gamification";

export async function GET() {
  try {
    const gameState = await getGameState();
    return NextResponse.json(gameState);
  } catch (error) {
    console.error("Failed to get game state:", error);
    return NextResponse.json({ error: "Failed to get game state" }, { status: 500 });
  }
}
