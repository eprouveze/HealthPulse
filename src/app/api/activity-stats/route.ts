import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailySteps, workouts, weights } from "@/lib/schema";
import { desc, sql, gte, and, lte } from "drizzle-orm";

interface ActivityStats {
  // Recent activity summary
  todaySteps: number;
  weekAvgSteps: number;
  monthAvgSteps: number;
  totalWorkouts: number;
  walkingWorkouts: number;
  totalCaloriesBurned: number;
  totalFlights: number;

  // Trends
  stepsStreak: number;
  activeMinutesThisWeek: number;
  activeMinutesLastWeek: number;

  // Correlation insights
  correlations: CorrelationInsight[];

  // Activity breakdown
  workoutsByType: { type: string; count: number; totalMinutes: number; totalKm: number; totalCalories: number }[];

  // Recent activity
  recentWorkouts: { date: string; type: string; duration: number; distance: number | null; calories: number | null }[];
  recentSteps: { date: string; steps: number; flights?: number }[];
}

interface CorrelationInsight {
  type: "positive" | "negative" | "neutral";
  message: string;
  detail?: string;
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get steps data
    const allSteps = await db
      .select()
      .from(dailySteps)
      .orderBy(desc(dailySteps.date));

    const todayStepsRecord = allSteps.find(s => s.date === today);
    const weekSteps = allSteps.filter(s => s.date >= weekAgo);
    const monthSteps = allSteps.filter(s => s.date >= monthAgo);

    const todaySteps = todayStepsRecord?.stepCount || 0;
    const weekAvgSteps = weekSteps.length > 0
      ? Math.round(weekSteps.reduce((a, b) => a + b.stepCount, 0) / weekSteps.length)
      : 0;
    const monthAvgSteps = monthSteps.length > 0
      ? Math.round(monthSteps.reduce((a, b) => a + b.stepCount, 0) / monthSteps.length)
      : 0;

    // Calculate steps streak (consecutive days with 5000+ steps)
    let stepsStreak = 0;
    for (const step of allSteps) {
      if (step.stepCount >= 5000) {
        stepsStreak++;
      } else {
        break;
      }
    }

    // Get workouts data
    const allWorkouts = await db
      .select()
      .from(workouts)
      .orderBy(desc(workouts.date));

    const walkingWorkouts = allWorkouts.filter(w => w.activityType === "walking").length;

    // Total calories burned across all workouts
    const totalCaloriesBurned = Math.round(
      allWorkouts.reduce((a, b) => a + (b.caloriesKcal || 0), 0)
    );

    // This week's active minutes
    const thisWeekWorkouts = allWorkouts.filter(w => w.date >= weekAgo);
    const activeMinutesThisWeek = Math.round(
      thisWeekWorkouts.reduce((a, b) => a + b.durationMinutes, 0)
    );

    // Last week's active minutes
    const lastWeekWorkouts = allWorkouts.filter(w => w.date >= twoWeeksAgo && w.date < weekAgo);
    const activeMinutesLastWeek = Math.round(
      lastWeekWorkouts.reduce((a, b) => a + b.durationMinutes, 0)
    );

    // Workout breakdown by type
    const workoutMap = new Map<string, { count: number; totalMinutes: number; totalKm: number; totalCalories: number }>();
    for (const w of allWorkouts) {
      const existing = workoutMap.get(w.activityType) || { count: 0, totalMinutes: 0, totalKm: 0, totalCalories: 0 };
      workoutMap.set(w.activityType, {
        count: existing.count + 1,
        totalMinutes: existing.totalMinutes + w.durationMinutes,
        totalKm: existing.totalKm + (w.distanceKm || 0),
        totalCalories: existing.totalCalories + (w.caloriesKcal || 0),
      });
    }
    const workoutsByType = Array.from(workoutMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count);

    // Recent data for display
    const recentWorkouts = allWorkouts.slice(0, 10).map(w => ({
      date: w.date,
      type: w.activityType,
      duration: Math.round(w.durationMinutes),
      distance: w.distanceKm ? Math.round(w.distanceKm * 10) / 10 : null,
      calories: w.caloriesKcal ? Math.round(w.caloriesKcal) : null,
    }));

    const recentSteps = allSteps.slice(0, 14).map(s => ({
      date: s.date,
      steps: s.stepCount,
      flights: s.flightsClimbed || 0,
    }));

    // Calculate total flights climbed
    const totalFlights = allSteps.reduce((a, b) => a + (b.flightsClimbed || 0), 0);

    // Calculate correlations between activity and weight changes
    const correlations = await calculateCorrelations(allSteps, allWorkouts, threeMonthsAgo);

    return NextResponse.json({
      todaySteps,
      weekAvgSteps,
      monthAvgSteps,
      totalWorkouts: allWorkouts.length,
      walkingWorkouts,
      totalCaloriesBurned,
      totalFlights,
      stepsStreak,
      activeMinutesThisWeek,
      activeMinutesLastWeek,
      correlations,
      workoutsByType,
      recentWorkouts,
      recentSteps,
    } as ActivityStats);
  } catch (error) {
    console.error("Failed to calculate activity stats:", error);
    return NextResponse.json({ error: "Failed to calculate activity stats" }, { status: 500 });
  }
}

async function calculateCorrelations(
  allSteps: { date: string; stepCount: number }[],
  allWorkouts: { date: string; activityType: string; durationMinutes: number; distanceKm: number | null }[],
  sinceDate: string
): Promise<CorrelationInsight[]> {
  const insights: CorrelationInsight[] = [];

  // Use 1 year of data for more meaningful correlations (not just 90 days)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  // Use the OLDER date to get more data (oneYearAgo is older, so use it)
  const analysisStartDate = oneYearAgo;

  // Get ALL weight data for long-term analysis
  const allWeightData = await db
    .select()
    .from(weights)
    .orderBy(weights.date);

  const recentWeightData = allWeightData.filter(w => w.date >= analysisStartDate);

  if (recentWeightData.length < 30) {
    return [{ type: "neutral", message: "Need more data to calculate correlations" }];
  }

  // Create date-indexed maps
  const stepsByDate = new Map(allSteps.map(s => [s.date, s.stepCount]));
  const workoutsByDate = new Map<string, number>();
  for (const w of allWorkouts) {
    workoutsByDate.set(w.date, (workoutsByDate.get(w.date) || 0) + w.durationMinutes);
  }

  // Group by MONTH for more stable analysis (not week - too noisy)
  const months = new Map<string, { steps: number[]; workoutMins: number; weights: number[] }>();
  for (const w of recentWeightData) {
    const monthKey = w.date.substring(0, 7); // YYYY-MM
    if (!months.has(monthKey)) {
      months.set(monthKey, { steps: [], workoutMins: 0, weights: [] });
    }
    const month = months.get(monthKey)!;
    month.weights.push(w.weightKg);
    const daySteps = stepsByDate.get(w.date);
    if (daySteps) month.steps.push(daySteps);
    const dayWorkout = workoutsByDate.get(w.date);
    if (dayWorkout) month.workoutMins += dayWorkout;
  }

  // Calculate monthly data with trend direction
  const sortedMonths = Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const monthlyData: { month: string; avgSteps: number; workoutMinutes: number; avgWeight: number; weightTrend: "down" | "up" | "flat" }[] = [];

  for (let i = 0; i < sortedMonths.length; i++) {
    const [month, data] = sortedMonths[i];
    const avgSteps = data.steps.length > 0
      ? data.steps.reduce((a, b) => a + b, 0) / data.steps.length
      : 0;
    const avgWeight = data.weights.reduce((a, b) => a + b, 0) / data.weights.length;

    // Determine weight trend by comparing first and last weight in month
    let weightTrend: "down" | "up" | "flat" = "flat";
    if (data.weights.length >= 3) {
      const firstWeights = data.weights.slice(0, Math.ceil(data.weights.length / 3));
      const lastWeights = data.weights.slice(-Math.ceil(data.weights.length / 3));
      const firstAvg = firstWeights.reduce((a, b) => a + b, 0) / firstWeights.length;
      const lastAvg = lastWeights.reduce((a, b) => a + b, 0) / lastWeights.length;
      const diff = lastAvg - firstAvg;
      if (diff < -0.3) weightTrend = "down";
      else if (diff > 0.3) weightTrend = "up";
    }

    monthlyData.push({
      month,
      avgSteps: Math.round(avgSteps),
      workoutMinutes: Math.round(data.workoutMins),
      avgWeight,
      weightTrend,
    });
  }

  if (monthlyData.length < 3) {
    return [{ type: "neutral", message: "Need more monthly data to calculate correlations" }];
  }

  // Analyze: Compare high vs low activity MONTHS (not weeks)
  const avgSteps = monthlyData.reduce((a, b) => a + b.avgSteps, 0) / monthlyData.length;
  const highActivityMonths = monthlyData.filter(m => m.avgSteps > avgSteps * 1.15);
  const lowActivityMonths = monthlyData.filter(m => m.avgSteps < avgSteps * 0.85);

  if (highActivityMonths.length >= 2 && lowActivityMonths.length >= 2) {
    // Count weight loss months in each group
    const highActivityLossRate = highActivityMonths.filter(m => m.weightTrend === "down").length / highActivityMonths.length;
    const lowActivityLossRate = lowActivityMonths.filter(m => m.weightTrend === "down").length / lowActivityMonths.length;

    // Compare average weights
    const highActivityAvgWeight = highActivityMonths.reduce((a, b) => a + b.avgWeight, 0) / highActivityMonths.length;
    const lowActivityAvgWeight = lowActivityMonths.reduce((a, b) => a + b.avgWeight, 0) / lowActivityMonths.length;

    if (highActivityLossRate > lowActivityLossRate + 0.15 || highActivityAvgWeight < lowActivityAvgWeight - 0.5) {
      insights.push({
        type: "positive",
        message: `Higher activity months correlate with better weight outcomes`,
        detail: `Active months: ${(highActivityLossRate * 100).toFixed(0)}% showed weight loss vs ${(lowActivityLossRate * 100).toFixed(0)}% for low activity months`,
      });
    } else if (lowActivityLossRate > highActivityLossRate + 0.15 && lowActivityAvgWeight < highActivityAvgWeight - 0.5) {
      // Only show this if BOTH conditions are true - more stringent
      insights.push({
        type: "neutral",
        message: `Short-term activity fluctuations show mixed weight correlations`,
        detail: `This is normal - diet, water retention, and other factors affect weekly weight`,
      });
    } else {
      insights.push({
        type: "neutral",
        message: `Activity and weight show complex relationship`,
        detail: `Long-term consistency matters more than individual week variations`,
      });
    }
  }

  // Long-term trend analysis - compare periods
  if (allWeightData.length > 100 && allSteps.length > 100) {
    // Find the user's lowest weight period and check activity then
    const sortedByWeight = [...allWeightData].sort((a, b) => a.weightKg - b.weightKg);
    const lowestPeriod = sortedByWeight.slice(0, Math.ceil(sortedByWeight.length * 0.1));
    const highestPeriod = sortedByWeight.slice(-Math.ceil(sortedByWeight.length * 0.1));

    const lowestPeriodSteps = lowestPeriod
      .map(w => stepsByDate.get(w.date))
      .filter((s): s is number => s !== undefined);
    const highestPeriodSteps = highestPeriod
      .map(w => stepsByDate.get(w.date))
      .filter((s): s is number => s !== undefined);

    if (lowestPeriodSteps.length > 5 && highestPeriodSteps.length > 5) {
      const lowestPeriodAvgSteps = lowestPeriodSteps.reduce((a, b) => a + b, 0) / lowestPeriodSteps.length;
      const highestPeriodAvgSteps = highestPeriodSteps.reduce((a, b) => a + b, 0) / highestPeriodSteps.length;

      if (lowestPeriodAvgSteps > highestPeriodAvgSteps * 1.2) {
        insights.push({
          type: "positive",
          message: `Your best weight periods had ${Math.round((lowestPeriodAvgSteps / highestPeriodAvgSteps - 1) * 100)}% more daily steps`,
          detail: `${Math.round(lowestPeriodAvgSteps).toLocaleString()} steps/day at lowest weights vs ${Math.round(highestPeriodAvgSteps).toLocaleString()} at highest`,
        });
      }
    }
  }

  // Walking distance insight (last 90 days for recency)
  const walkingWorkouts = allWorkouts.filter(w => w.activityType === "walking" && w.date >= sinceDate);
  if (walkingWorkouts.length > 0) {
    const totalKm = walkingWorkouts.reduce((a, b) => a + (b.distanceKm || 0), 0);
    const totalMinutes = walkingWorkouts.reduce((a, b) => a + b.durationMinutes, 0);
    insights.push({
      type: "positive",
      message: `${walkingWorkouts.length} walking sessions totaling ${Math.round(totalKm)} km in last 90 days`,
      detail: `${Math.round(totalMinutes / 60)} hours of walking exercise`,
    });
  }

  return insights.length > 0 ? insights : [{ type: "neutral", message: "Analyzing patterns..." }];
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  return new Date(date.setDate(diff)).toISOString().split("T")[0];
}
