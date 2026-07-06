import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  weights,
  goals,
  entries,
  dailySteps,
  workouts,
  settings,
  dailySleep,
  restingHeartRate,
  workoutRoutes,
  bodyComposition,
  vo2max,
  heartRateVariability,
  nutritionSprints,
  foodEntries,
} from "@/lib/schema";
import { desc } from "drizzle-orm";

// Full raw export of every table in the schema. Unlike the individual
// resource GET endpoints (e.g. /api/vo2max, /api/hrv), this does a plain
// unfiltered select per table so the export is a complete backup, not a
// derived/windowed view.
export async function GET() {
  try {
    const [
      allWeights,
      allGoals,
      allEntries,
      allDailySteps,
      allWorkouts,
      allSettings,
      allDailySleep,
      allRestingHeartRate,
      allWorkoutRoutes,
      allBodyComposition,
      allVo2max,
      allHeartRateVariability,
      allNutritionSprints,
      allFoodEntries,
    ] = await Promise.all([
      db.select().from(weights).orderBy(desc(weights.date)),
      db.select().from(goals).orderBy(desc(goals.createdAt)),
      db.select().from(entries).orderBy(desc(entries.date)),
      db.select().from(dailySteps).orderBy(desc(dailySteps.date)),
      db.select().from(workouts).orderBy(desc(workouts.date)),
      db.select().from(settings),
      db.select().from(dailySleep).orderBy(desc(dailySleep.date)),
      db.select().from(restingHeartRate).orderBy(desc(restingHeartRate.date)),
      db.select().from(workoutRoutes).orderBy(desc(workoutRoutes.date)),
      db.select().from(bodyComposition).orderBy(desc(bodyComposition.date)),
      db.select().from(vo2max).orderBy(desc(vo2max.date)),
      db
        .select()
        .from(heartRateVariability)
        .orderBy(desc(heartRateVariability.date)),
      db
        .select()
        .from(nutritionSprints)
        .orderBy(desc(nutritionSprints.startDate)),
      db
        .select()
        .from(foodEntries)
        .orderBy(desc(foodEntries.date), desc(foodEntries.time)),
    ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      weights: allWeights,
      goals: allGoals,
      entries: allEntries,
      dailySteps: allDailySteps,
      workouts: allWorkouts,
      settings: allSettings,
      dailySleep: allDailySleep,
      restingHeartRate: allRestingHeartRate,
      workoutRoutes: allWorkoutRoutes,
      bodyComposition: allBodyComposition,
      vo2max: allVo2max,
      heartRateVariability: allHeartRateVariability,
      nutritionSprints: allNutritionSprints,
      foodEntries: allFoodEntries,
    });
  } catch (error) {
    console.error("Failed to export data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}
