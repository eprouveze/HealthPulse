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

  // Trends
  stepsStreak: number;
  activeMinutesThisWeek: number;
  activeMinutesLastWeek: number;

  // Correlation insights
  correlations: CorrelationInsight[];

  // Activity breakdown
  workoutsByType: { type: string; count: number; totalMinutes: number; totalKm: number }[];

  // Recent activity
  recentWorkouts: { date: string; type: string; duration: number; distance: number | null }[];
  recentSteps: { date: string; steps: number }[];
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
    const workoutMap = new Map<string, { count: number; totalMinutes: number; totalKm: number }>();
    for (const w of allWorkouts) {
      const existing = workoutMap.get(w.activityType) || { count: 0, totalMinutes: 0, totalKm: 0 };
      workoutMap.set(w.activityType, {
        count: existing.count + 1,
        totalMinutes: existing.totalMinutes + w.durationMinutes,
        totalKm: existing.totalKm + (w.distanceKm || 0),
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
    }));

    const recentSteps = allSteps.slice(0, 14).map(s => ({
      date: s.date,
      steps: s.stepCount,
    }));

    // Calculate correlations between activity and weight changes
    const correlations = await calculateCorrelations(allSteps, allWorkouts, threeMonthsAgo);

    return NextResponse.json({
      todaySteps,
      weekAvgSteps,
      monthAvgSteps,
      totalWorkouts: allWorkouts.length,
      walkingWorkouts,
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

  // Get weight data for the same period
  const weightData = await db
    .select()
    .from(weights)
    .where(gte(weights.date, sinceDate))
    .orderBy(weights.date);

  if (weightData.length < 14) {
    return [{ type: "neutral", message: "Need more data to calculate correlations" }];
  }

  // Create date-indexed maps
  const stepsByDate = new Map(allSteps.map(s => [s.date, s.stepCount]));
  const workoutsByDate = new Map<string, number>();
  for (const w of allWorkouts) {
    workoutsByDate.set(w.date, (workoutsByDate.get(w.date) || 0) + w.durationMinutes);
  }

  // Analyze: High activity weeks vs weight change
  const weeklyData: { weekStart: string; avgSteps: number; workoutMinutes: number; weightChange: number }[] = [];

  // Group by week
  const weeks = new Map<string, { steps: number[]; workoutMins: number; weights: number[] }>();
  for (const w of weightData) {
    const weekStart = getWeekStart(w.date);
    if (!weeks.has(weekStart)) {
      weeks.set(weekStart, { steps: [], workoutMins: 0, weights: [] });
    }
    const week = weeks.get(weekStart)!;
    week.weights.push(w.weightKg);
    const daySteps = stepsByDate.get(w.date);
    if (daySteps) week.steps.push(daySteps);
    const dayWorkout = workoutsByDate.get(w.date);
    if (dayWorkout) week.workoutMins += dayWorkout;
  }

  // Calculate weekly averages and weight changes
  const sortedWeeks = Array.from(weeks.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (let i = 1; i < sortedWeeks.length; i++) {
    const [weekStart, data] = sortedWeeks[i];
    const prevWeek = sortedWeeks[i - 1][1];

    const avgSteps = data.steps.length > 0
      ? data.steps.reduce((a, b) => a + b, 0) / data.steps.length
      : 0;
    const prevAvgWeight = prevWeek.weights.reduce((a, b) => a + b, 0) / prevWeek.weights.length;
    const currAvgWeight = data.weights.reduce((a, b) => a + b, 0) / data.weights.length;

    weeklyData.push({
      weekStart,
      avgSteps: Math.round(avgSteps),
      workoutMinutes: Math.round(data.workoutMins),
      weightChange: currAvgWeight - prevAvgWeight,
    });
  }

  if (weeklyData.length < 4) {
    return [{ type: "neutral", message: "Need more weekly data to calculate correlations" }];
  }

  // Analyze high vs low activity weeks
  const avgSteps = weeklyData.reduce((a, b) => a + b.avgSteps, 0) / weeklyData.length;
  const highActivityWeeks = weeklyData.filter(w => w.avgSteps > avgSteps * 1.2);
  const lowActivityWeeks = weeklyData.filter(w => w.avgSteps < avgSteps * 0.8);

  if (highActivityWeeks.length >= 2 && lowActivityWeeks.length >= 2) {
    const highActivityWeightChange = highActivityWeeks.reduce((a, b) => a + b.weightChange, 0) / highActivityWeeks.length;
    const lowActivityWeightChange = lowActivityWeeks.reduce((a, b) => a + b.weightChange, 0) / lowActivityWeeks.length;

    if (highActivityWeightChange < lowActivityWeightChange - 0.1) {
      insights.push({
        type: "positive",
        message: `High activity weeks correlate with better weight loss`,
        detail: `High activity: ${highActivityWeightChange > 0 ? "+" : ""}${highActivityWeightChange.toFixed(2)} kg/week vs Low activity: ${lowActivityWeightChange > 0 ? "+" : ""}${lowActivityWeightChange.toFixed(2)} kg/week`,
      });
    } else if (lowActivityWeightChange < highActivityWeightChange - 0.1) {
      insights.push({
        type: "negative",
        message: `Surprisingly, lower activity weeks show better weight outcomes`,
        detail: `This may indicate diet plays a larger role than exercise for you`,
      });
    } else {
      insights.push({
        type: "neutral",
        message: `Activity levels show minimal correlation with weight changes`,
        detail: `Both high and low activity weeks have similar weight outcomes`,
      });
    }
  }

  // Analyze workout frequency correlation
  const weeksWithWorkouts = weeklyData.filter(w => w.workoutMinutes > 60);
  const weeksWithoutWorkouts = weeklyData.filter(w => w.workoutMinutes <= 60);

  if (weeksWithWorkouts.length >= 2 && weeksWithoutWorkouts.length >= 2) {
    const withWorkoutsChange = weeksWithWorkouts.reduce((a, b) => a + b.weightChange, 0) / weeksWithWorkouts.length;
    const withoutWorkoutsChange = weeksWithoutWorkouts.reduce((a, b) => a + b.weightChange, 0) / weeksWithoutWorkouts.length;

    if (withWorkoutsChange < withoutWorkoutsChange - 0.1) {
      insights.push({
        type: "positive",
        message: `Weeks with workout sessions show ${Math.abs(withWorkoutsChange - withoutWorkoutsChange).toFixed(2)} kg better results`,
      });
    }
  }

  // Step count threshold analysis
  const stepThreshold = 8000;
  const highStepDays = allSteps.filter(s => s.stepCount >= stepThreshold && s.date >= sinceDate);
  const lowStepDays = allSteps.filter(s => s.stepCount < stepThreshold && s.date >= sinceDate);

  if (highStepDays.length > 10 && lowStepDays.length > 10) {
    insights.push({
      type: "neutral",
      message: `${highStepDays.length} days with 8,000+ steps vs ${lowStepDays.length} days below`,
      detail: `Average: ${Math.round(allSteps.filter(s => s.date >= sinceDate).reduce((a, b) => a + b.stepCount, 0) / allSteps.filter(s => s.date >= sinceDate).length).toLocaleString()} steps/day`,
    });
  }

  // Walking distance insight
  const walkingWorkouts = allWorkouts.filter(w => w.activityType === "walking" && w.date >= sinceDate);
  if (walkingWorkouts.length > 0) {
    const totalKm = walkingWorkouts.reduce((a, b) => a + (b.distanceKm || 0), 0);
    const totalMinutes = walkingWorkouts.reduce((a, b) => a + b.durationMinutes, 0);
    insights.push({
      type: "positive",
      message: `${walkingWorkouts.length} walking sessions totaling ${Math.round(totalKm)} km`,
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
