import { db } from "./db";
import { weights } from "./schema";
import { desc, asc, eq, and, gte, lte, sql } from "drizzle-orm";

export interface Milestone {
  type: "lowest_since" | "back_to" | "total_lost" | "streak" | "rate";
  message: string;
  date?: string;
  value?: number;
  importance: "high" | "medium" | "low";
}

export interface TrendAnalysis {
  weeklyChange: number;
  monthlyChange: number;
  threeMonthChange: number;
  yearlyChange: number;
  averageWeeklyLoss: number;
  predictedGoalDate: string | null;
  trend: "losing" | "gaining" | "stable";
}

export interface HistoricalComparison {
  date: string;
  weight: number;
  message: string;
}

/**
 * Find milestone achievements based on current weight
 */
export async function findMilestones(currentWeight: number): Promise<Milestone[]> {
  const milestones: Milestone[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Get all weights ordered by date
  const allWeights = await db
    .select()
    .from(weights)
    .orderBy(desc(weights.date));

  if (allWeights.length < 2) return milestones;

  // Find lowest weight ever
  const lowestEver = Math.min(...allWeights.map((w) => w.weightKg));
  if (currentWeight <= lowestEver) {
    milestones.push({
      type: "lowest_since",
      message: "🎉 This is your lowest weight on record!",
      importance: "high",
    });
  }

  // Find when we were last at this weight
  const sameWeightEntry = allWeights.find(
    (w) => Math.abs(w.weightKg - currentWeight) < 0.5 && w.date !== today
  );
  if (sameWeightEntry) {
    const daysSince = Math.floor(
      (new Date(today).getTime() - new Date(sameWeightEntry.date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSince > 30) {
      const yearsAgo = (daysSince / 365).toFixed(1);
      milestones.push({
        type: "back_to",
        message: `📅 You're back to your weight from ${yearsAgo} years ago! (${sameWeightEntry.date})`,
        date: sameWeightEntry.date,
        importance: daysSince > 365 ? "high" : "medium",
      });
    }
  }

  // Find highest weight for total lost calculation
  const highestWeight = Math.max(...allWeights.map((w) => w.weightKg));
  const totalLost = highestWeight - currentWeight;
  if (totalLost >= 5 && totalLost % 5 < 0.5) {
    milestones.push({
      type: "total_lost",
      message: `🔥 You've lost ${Math.floor(totalLost)} kg from your peak of ${highestWeight.toFixed(1)} kg!`,
      value: totalLost,
      importance: totalLost >= 10 ? "high" : "medium",
    });
  }

  // Check for consistent loss streak
  const recentWeights = allWeights.slice(0, 7);
  if (recentWeights.length >= 7) {
    let streak = 0;
    for (let i = 0; i < recentWeights.length - 1; i++) {
      if (recentWeights[i].weightKg <= recentWeights[i + 1].weightKg) {
        streak++;
      } else {
        break;
      }
    }
    if (streak >= 5) {
      milestones.push({
        type: "streak",
        message: `📈 ${streak}-day downward streak! Keep it up!`,
        value: streak,
        importance: streak >= 7 ? "high" : "medium",
      });
    }
  }

  return milestones;
}

/**
 * Analyze weight trends over different time periods
 */
export async function analyzeTrends(
  currentWeight: number,
  goalWeight?: number
): Promise<TrendAnalysis> {
  const today = new Date();

  const getWeightOnDate = async (daysAgo: number): Promise<number | null> => {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - daysAgo);
    const dateStr = targetDate.toISOString().split("T")[0];

    // Find closest weight within 3 days
    const nearby = await db
      .select()
      .from(weights)
      .where(
        and(
          gte(weights.date, new Date(targetDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          lte(weights.date, new Date(targetDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        )
      )
      .orderBy(weights.date)
      .limit(1);

    return nearby[0]?.weightKg ?? null;
  };

  const weekAgo = await getWeightOnDate(7);
  const monthAgo = await getWeightOnDate(30);
  const threeMonthsAgo = await getWeightOnDate(90);
  const yearAgo = await getWeightOnDate(365);

  const weeklyChange = weekAgo ? currentWeight - weekAgo : 0;
  const monthlyChange = monthAgo ? currentWeight - monthAgo : 0;
  const threeMonthChange = threeMonthsAgo ? currentWeight - threeMonthsAgo : 0;
  const yearlyChange = yearAgo ? currentWeight - yearAgo : 0;

  // Calculate average weekly loss over last 3 months
  const averageWeeklyLoss = threeMonthsAgo ? (threeMonthsAgo - currentWeight) / 12 : 0;

  // Predict goal date
  let predictedGoalDate: string | null = null;
  if (goalWeight && averageWeeklyLoss > 0) {
    const kgToLose = currentWeight - goalWeight;
    const weeksNeeded = kgToLose / averageWeeklyLoss;
    const goalDate = new Date(today);
    goalDate.setDate(today.getDate() + weeksNeeded * 7);
    predictedGoalDate = goalDate.toISOString().split("T")[0];
  }

  // Determine overall trend
  let trend: "losing" | "gaining" | "stable" = "stable";
  if (monthlyChange < -0.5) trend = "losing";
  else if (monthlyChange > 0.5) trend = "gaining";

  return {
    weeklyChange,
    monthlyChange,
    threeMonthChange,
    yearlyChange,
    averageWeeklyLoss,
    predictedGoalDate,
    trend,
  };
}

/**
 * Find interesting historical comparisons
 */
export async function findHistoricalComparisons(
  currentWeight: number
): Promise<HistoricalComparison[]> {
  const comparisons: HistoricalComparison[] = [];

  // Find entries at similar weight in the past
  const similar = await db
    .select()
    .from(weights)
    .where(
      and(
        gte(weights.weightKg, currentWeight - 1),
        lte(weights.weightKg, currentWeight + 1)
      )
    )
    .orderBy(asc(weights.date))
    .limit(10);

  const today = new Date();
  for (const entry of similar) {
    const entryDate = new Date(entry.date);
    const daysDiff = Math.floor(
      (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 365) {
      const years = (daysDiff / 365).toFixed(1);
      comparisons.push({
        date: entry.date,
        weight: entry.weightKg,
        message: `You weighed ${entry.weightKg.toFixed(1)} kg ${years} years ago on ${entry.date}`,
      });
    }
  }

  return comparisons.slice(0, 3);
}

/**
 * Generate insights about weight patterns
 */
export async function generateInsights(): Promise<string[]> {
  const insights: string[] = [];

  const allWeights = await db
    .select()
    .from(weights)
    .orderBy(desc(weights.date));

  if (allWeights.length < 30) {
    return ["Not enough data for pattern analysis yet."];
  }

  // Analyze day-of-week patterns
  const byDayOfWeek: { [key: number]: number[] } = {};
  for (const w of allWeights.slice(0, 90)) {
    const day = new Date(w.date).getDay();
    if (!byDayOfWeek[day]) byDayOfWeek[day] = [];
    byDayOfWeek[day].push(w.weightKg);
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayAverages = Object.entries(byDayOfWeek).map(([day, weights]) => ({
    day: parseInt(day),
    avg: weights.reduce((a, b) => a + b, 0) / weights.length,
  }));

  if (dayAverages.length >= 7) {
    const highest = dayAverages.reduce((a, b) => (a.avg > b.avg ? a : b));
    const lowest = dayAverages.reduce((a, b) => (a.avg < b.avg ? a : b));

    if (highest.avg - lowest.avg > 0.5) {
      insights.push(
        `📊 Pattern detected: You tend to weigh most on ${dayNames[highest.day]}s and least on ${dayNames[lowest.day]}s (${(highest.avg - lowest.avg).toFixed(1)} kg difference).`
      );
    }
  }

  // Find best and worst months
  const byMonth: { [key: string]: number[] } = {};
  for (const w of allWeights) {
    const month = w.date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(w.weightKg);
  }

  const monthChanges: { month: string; change: number }[] = [];
  const months = Object.keys(byMonth).sort();
  for (let i = 1; i < months.length; i++) {
    const prevAvg = byMonth[months[i - 1]].reduce((a, b) => a + b, 0) / byMonth[months[i - 1]].length;
    const currAvg = byMonth[months[i]].reduce((a, b) => a + b, 0) / byMonth[months[i]].length;
    monthChanges.push({ month: months[i], change: currAvg - prevAvg });
  }

  if (monthChanges.length > 0) {
    const bestMonth = monthChanges.reduce((a, b) => (a.change < b.change ? a : b));
    if (bestMonth.change < -1) {
      insights.push(
        `🏆 Your best month was ${bestMonth.month} with ${Math.abs(bestMonth.change).toFixed(1)} kg lost.`
      );
    }
  }

  return insights;
}
