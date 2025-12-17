import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { weights, goals, dailySteps, workouts } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

const SYSTEM_PROMPT = `You are a supportive and knowledgeable weight loss coach. You have access to the user's COMPLETE weight history, activity data (steps, workouts), and current progress spanning multiple years.

Your role is to:
1. Provide personalized, actionable advice based on their specific data
2. Analyze correlations between activity and weight changes
3. Compare current performance to historical periods when asked
4. Celebrate milestones and progress
5. Offer encouragement during plateaus or setbacks
6. Share evidence-based weight loss tips
7. Be motivating but realistic

Keep responses concise (2-4 paragraphs) unless the user asks for detailed analysis. Use a warm, encouraging tone. Focus on sustainable habits, not quick fixes.

Guidelines:
- Recommend 0.5-1kg/week as healthy weight loss pace
- Emphasize protein intake, hydration, sleep, and consistent activity
- Acknowledge that weight fluctuates day-to-day (water, sodium, etc.)
- Never recommend extreme restriction (<1200 kcal for women, <1500 for men)
- Walking is this user's primary exercise - encourage and celebrate it
- You have access to ALL historical data - use it to provide insights and comparisons
- Reference their actual activity data when giving advice`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { apiKey, question, conversationHistory } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required. Set it in Settings." },
        { status: 400 }
      );
    }

    // Gather ALL user data for comprehensive context
    const allWeights = await db.select().from(weights).orderBy(weights.date);
    const allSteps = await db.select().from(dailySteps).orderBy(dailySteps.date);
    const allWorkouts = await db.select().from(workouts).orderBy(workouts.date);
    const activeGoal = await db
      .select()
      .from(goals)
      .where(eq(goals.isActive, true))
      .limit(1);

    if (allWeights.length === 0) {
      return NextResponse.json({ error: "No weight data to analyze" }, { status: 400 });
    }

    const current = allWeights[allWeights.length - 1];
    const earliest = allWeights[0];
    const totalDays = Math.round(
      (new Date(current.date).getTime() - new Date(earliest.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Format all weight data compactly (date:weight)
    const weightHistory = allWeights.map(w => `${w.date}:${w.weightKg}`).join("|");

    // Format all steps data compactly (date:count)
    const stepsHistory = allSteps.map(s => `${s.date}:${s.stepCount}`).join("|");

    // Format all workouts compactly (date:type:mins:km)
    const workoutHistory = allWorkouts
      .map(w => `${w.date}:${w.activityType}:${Math.round(w.durationMinutes)}:${w.distanceKm?.toFixed(1) || 0}`)
      .join("|");

    // Calculate summary stats
    const recentWeights = allWeights.slice(-30);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const recentSteps = allSteps.filter(s => s.date >= thirtyDaysAgo);
    const recentWorkouts = allWorkouts.filter(w => w.date >= thirtyDaysAgo);

    const avgStepsLast30 = recentSteps.length > 0
      ? Math.round(recentSteps.reduce((a, b) => a + b.stepCount, 0) / recentSteps.length)
      : 0;

    const walkingWorkouts = allWorkouts.filter(w => w.activityType === "walking");
    const totalWalkingKm = walkingWorkouts.reduce((a, b) => a + (b.distanceKm || 0), 0);

    // Workout breakdown by type
    const workoutTypes = new Map<string, number>();
    for (const w of allWorkouts) {
      workoutTypes.set(w.activityType, (workoutTypes.get(w.activityType) || 0) + 1);
    }
    const workoutBreakdown = Array.from(workoutTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ");

    // Yearly summaries for quick reference
    const yearlyStats: Record<string, { avgWeight: number; totalSteps: number; totalWorkouts: number; walkingKm: number }> = {};
    for (const w of allWeights) {
      const year = w.date.slice(0, 4);
      if (!yearlyStats[year]) {
        yearlyStats[year] = { avgWeight: 0, totalSteps: 0, totalWorkouts: 0, walkingKm: 0 };
      }
      yearlyStats[year].avgWeight += w.weightKg;
    }
    for (const s of allSteps) {
      const year = s.date.slice(0, 4);
      if (yearlyStats[year]) {
        yearlyStats[year].totalSteps += s.stepCount;
      }
    }
    for (const w of allWorkouts) {
      const year = w.date.slice(0, 4);
      if (yearlyStats[year]) {
        yearlyStats[year].totalWorkouts++;
        if (w.activityType === "walking") {
          yearlyStats[year].walkingKm += w.distanceKm || 0;
        }
      }
    }

    // Calculate averages
    const weightCountByYear: Record<string, number> = {};
    for (const w of allWeights) {
      const year = w.date.slice(0, 4);
      weightCountByYear[year] = (weightCountByYear[year] || 0) + 1;
    }
    for (const year of Object.keys(yearlyStats)) {
      yearlyStats[year].avgWeight = Math.round(yearlyStats[year].avgWeight / weightCountByYear[year] * 10) / 10;
    }

    const yearlySummary = Object.entries(yearlyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, stats]) =>
        `${year}: avgWeight=${stats.avgWeight}kg, steps=${Math.round(stats.totalSteps/1000)}k, workouts=${stats.totalWorkouts}, walkingKm=${Math.round(stats.walkingKm)}`
      )
      .join("\n");

    const context = `
=== SUMMARY ===
Current: ${current.weightKg}kg (${current.date})
Starting: ${earliest.weightKg}kg (${earliest.date})
Total change: ${(earliest.weightKg - current.weightKg).toFixed(1)}kg over ${totalDays} days
Goal: ${activeGoal[0] ? `${activeGoal[0].targetWeight}kg (${(current.weightKg - activeGoal[0].targetWeight).toFixed(1)}kg to go)` : "Not set"}

Last 30 days: Avg ${avgStepsLast30.toLocaleString()} steps/day, ${recentWorkouts.length} workouts

All-time: ${allWeights.length} weigh-ins, ${allSteps.length} step days, ${allWorkouts.length} workouts
Total walking: ${Math.round(totalWalkingKm)}km across ${walkingWorkouts.length} sessions
Workout types: ${workoutBreakdown}

=== YEARLY OVERVIEW ===
${yearlySummary}

=== COMPLETE WEIGHT HISTORY (${allWeights.length} entries) ===
Format: date:kg|date:kg|...
${weightHistory}

=== COMPLETE STEP HISTORY (${allSteps.length} entries) ===
Format: date:steps|date:steps|...
${stepsHistory}

=== COMPLETE WORKOUT HISTORY (${allWorkouts.length} entries) ===
Format: date:type:minutes:km|...
${workoutHistory}
`;

    const client = new Anthropic({ apiKey });

    // Build messages array with conversation history
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    if (conversationHistory && conversationHistory.length > 0) {
      const history = conversationHistory as ChatMessage[];
      for (let i = 0; i < history.length; i++) {
        if (i === 0 && history[i].role === "assistant") {
          messages.push({ role: "assistant", content: history[i].content });
        } else {
          messages.push({ role: history[i].role, content: history[i].content });
        }
      }
      if (question) {
        messages.push({ role: "user", content: question });
      }
    } else {
      const userMessage = question
        ? `User's question: ${question}`
        : `Please provide today's coaching message with personalized advice based on my weight and activity data.`;
      messages.push({ role: "user", content: userMessage });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: SYSTEM_PROMPT + `\n\n${context}`,
      messages,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
    }

    return NextResponse.json({
      message: content.text,
      context: {
        current: current.weightKg,
        goal: activeGoal[0]?.targetWeight,
        totalLost: earliest.weightKg - current.weightKg,
        dataPoints: {
          weights: allWeights.length,
          steps: allSteps.length,
          workouts: allWorkouts.length,
        },
      },
    });
  } catch (error) {
    console.error("Coach API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
