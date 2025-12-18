import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { weights, goals, dailySteps, workouts, dailySleep, restingHeartRate, workoutRoutes } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

const SYSTEM_PROMPT = `You are a supportive and knowledgeable weight loss coach. You have access to the user's COMPLETE weight history, activity data (steps, workouts), health metrics (resting heart rate), and current progress spanning multiple years.

IMPORTANT MEDICAL CONTEXT:
The user had a successful sleeve gastrectomy (bariatric surgery) on November 1, 2018. This is crucial context for understanding their weight journey:
- Pre-surgery: Weight reached ~114kg in July 2018
- Post-surgery: Rapid loss from 106kg to 86kg (lowest in mid-2019)
- The surgery permanently reduced stomach capacity (~80% removed)
- This affects: portion sizes, protein absorption, vitamin needs, and weight loss/regain patterns
- Post-bariatric patients can regain weight years later if habits slip - this is normal but requires attention
- Their current goal is to get back toward their post-surgery success weight

IMPORTANT DATA LIMITATION - SLEEP:
The sleep data in this system is INCOMPLETE and NOT representative of actual sleep patterns. The user does NOT sleep with their Apple Watch, so the recorded "sleep" entries are only occasional naps or brief periods when the watch happened to be worn. DO NOT:
- Comment on sleep quality or duration
- Give advice about improving sleep
- Suggest that sleep is a problem area
- Use sleep data to explain weight changes
The sleep data should be IGNORED for coaching purposes.

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
- For post-bariatric patients: focus on protein-first eating, small frequent meals, avoiding drinking with meals
- Recommend 0.5-1kg/week as healthy weight loss pace (faster is possible but not sustainable)
- Emphasize protein intake (critical post-surgery), hydration, and consistent activity
- Acknowledge that weight fluctuates day-to-day (water, sodium, etc.)
- Never recommend extreme restriction - post-bariatric patients already have reduced intake capacity
- Walking is this user's primary exercise - encourage and celebrate it
- You have access to ALL historical data - use it to provide insights and comparisons
- Reference their actual activity data when giving advice
- When discussing their journey, acknowledge the surgery as a tool that requires ongoing lifestyle commitment
- Use resting heart rate trends as an indicator of fitness level and recovery
- IGNORE sleep data entirely - it is incomplete and not useful for analysis`;

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
    const allSleep = await db.select().from(dailySleep).orderBy(dailySleep.date);
    const allRestingHR = await db.select().from(restingHeartRate).orderBy(restingHeartRate.date);
    const allRoutes = await db.select().from(workoutRoutes).orderBy(workoutRoutes.date);
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

    // Format sleep data compactly (date:hours)
    const sleepHistory = allSleep
      .map(s => `${s.date}:${(s.durationMinutes / 60).toFixed(1)}`)
      .join("|");

    // Format resting HR data compactly (date:bpm)
    const restingHRHistory = allRestingHR
      .map(h => `${h.date}:${h.bpm}`)
      .join("|");

    // Format workout routes compactly (date:type:mins:km:gpsPoints)
    const routesHistory = allRoutes
      .map(r => {
        const routeData = typeof r.routeData === "string" ? JSON.parse(r.routeData) : r.routeData;
        return `${r.date}:${r.activityType}:${Math.round(r.durationMinutes)}:${r.distanceKm?.toFixed(1) || 0}:${routeData.length}pts`;
      })
      .join("|");

    // Calculate summary stats
    const recentWeights = allWeights.slice(-30);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const recentSteps = allSteps.filter(s => s.date >= thirtyDaysAgo);
    const recentWorkouts = allWorkouts.filter(w => w.date >= thirtyDaysAgo);
    const recentSleep = allSleep.filter(s => s.date >= thirtyDaysAgo);
    const recentHR = allRestingHR.filter(h => h.date >= thirtyDaysAgo);

    const avgStepsLast30 = recentSteps.length > 0
      ? Math.round(recentSteps.reduce((a, b) => a + b.stepCount, 0) / recentSteps.length)
      : 0;

    const avgSleepLast30 = recentSleep.length > 0
      ? (recentSleep.reduce((a, b) => a + b.durationMinutes, 0) / recentSleep.length / 60).toFixed(1)
      : "N/A";

    const avgHRLast30 = recentHR.length > 0
      ? Math.round(recentHR.reduce((a, b) => a + b.bpm, 0) / recentHR.length)
      : "N/A";

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
    const yearlyStats: Record<string, { avgWeight: number; weightCount: number; totalSteps: number; totalWorkouts: number; walkingKm: number; avgSleep: number; sleepCount: number; avgHR: number; hrCount: number }> = {};
    for (const w of allWeights) {
      const year = w.date.slice(0, 4);
      if (!yearlyStats[year]) {
        yearlyStats[year] = { avgWeight: 0, weightCount: 0, totalSteps: 0, totalWorkouts: 0, walkingKm: 0, avgSleep: 0, sleepCount: 0, avgHR: 0, hrCount: 0 };
      }
      yearlyStats[year].avgWeight += w.weightKg;
      yearlyStats[year].weightCount++;
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
    for (const s of allSleep) {
      const year = s.date.slice(0, 4);
      if (yearlyStats[year]) {
        yearlyStats[year].avgSleep += s.durationMinutes / 60;
        yearlyStats[year].sleepCount++;
      }
    }
    for (const h of allRestingHR) {
      const year = h.date.slice(0, 4);
      if (yearlyStats[year]) {
        yearlyStats[year].avgHR += h.bpm;
        yearlyStats[year].hrCount++;
      }
    }

    // Calculate averages
    for (const year of Object.keys(yearlyStats)) {
      const s = yearlyStats[year];
      s.avgWeight = s.weightCount > 0 ? Math.round(s.avgWeight / s.weightCount * 10) / 10 : 0;
      s.avgSleep = s.sleepCount > 0 ? Math.round(s.avgSleep / s.sleepCount * 10) / 10 : 0;
      s.avgHR = s.hrCount > 0 ? Math.round(s.avgHR / s.hrCount) : 0;
    }

    const yearlySummary = Object.entries(yearlyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, stats]) =>
        `${year}: avgWeight=${stats.avgWeight}kg, steps=${Math.round(stats.totalSteps/1000)}k, workouts=${stats.totalWorkouts}, walkingKm=${Math.round(stats.walkingKm)}` +
        (stats.avgSleep > 0 ? `, avgSleep=${stats.avgSleep}h` : "") +
        (stats.avgHR > 0 ? `, avgHR=${stats.avgHR}bpm` : "")
      )
      .join("\n");

    const context = `
=== SUMMARY ===
Current: ${current.weightKg}kg (${current.date})
Starting: ${earliest.weightKg}kg (${earliest.date})
Total change: ${(earliest.weightKg - current.weightKg).toFixed(1)}kg over ${totalDays} days
Goal: ${activeGoal[0] ? `${activeGoal[0].targetWeight}kg (${(current.weightKg - activeGoal[0].targetWeight).toFixed(1)}kg to go)` : "Not set"}

Last 30 days: Avg ${avgStepsLast30.toLocaleString()} steps/day, ${recentWorkouts.length} workouts, Avg sleep ${avgSleepLast30}h, Avg resting HR ${avgHRLast30}bpm

All-time: ${allWeights.length} weigh-ins, ${allSteps.length} step days, ${allWorkouts.length} workouts, ${allSleep.length} sleep nights, ${allRestingHR.length} HR readings, ${allRoutes.length} GPS routes
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

=== COMPLETE SLEEP HISTORY (${allSleep.length} entries) ===
Format: date:hours|date:hours|...
${sleepHistory}

=== COMPLETE RESTING HEART RATE HISTORY (${allRestingHR.length} entries) ===
Format: date:bpm|date:bpm|...
${restingHRHistory}

=== GPS-TRACKED WORKOUT ROUTES (${allRoutes.length} entries) ===
Format: date:type:minutes:km:gpsPoints|...
${routesHistory}
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
          sleep: allSleep.length,
          restingHR: allRestingHR.length,
          routes: allRoutes.length,
        },
      },
    });
  } catch (error) {
    console.error("Coach API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
