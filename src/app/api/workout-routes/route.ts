import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutRoutes } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const routes = await db
      .select()
      .from(workoutRoutes)
      .orderBy(desc(workoutRoutes.date));

    // Parse routeData JSON for each route
    const parsedRoutes = routes.map(route => ({
      ...route,
      routeData: JSON.parse(route.routeData),
    }));

    return NextResponse.json(parsedRoutes);
  } catch (error) {
    console.error("Failed to fetch workout routes:", error);
    return NextResponse.json({ error: "Failed to fetch workout routes" }, { status: 500 });
  }
}
