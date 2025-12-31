import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { weights, goals, dailySteps, workouts, dailySleep, restingHeartRate, workoutRoutes } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";

// Personal medical context from environment (optional, for personalized coaching)
const PERSONAL_CONTEXT = process.env.PERSONAL_MEDICAL_CONTEXT || "";

const SYSTEM_PROMPT = `You are a supportive and knowledgeable weight loss coach. You have access to the user's COMPLETE weight history, activity data (steps, workouts), health metrics (resting heart rate), and current progress spanning multiple years.

IMPORTANT DATA LIMITATION - SLEEP:
The sleep data in this system is INCOMPLETE and NOT representative of actual sleep patterns. The user does NOT sleep with their Apple Watch, so the recorded "sleep" entries are only occasional naps or brief periods when the watch happened to be worn. DO NOT:
- Comment on sleep quality or duration
- Give advice about improving sleep
- Suggest that sleep is a problem area
- Use sleep data to explain weight changes
The sleep data should be IGNORED for coaching purposes.

RECOVERY METRICS - HEART RATE VARIABILITY (HRV):
You have access to HRV data (SDNN measurement in milliseconds). HRV is a key indicator of recovery, stress, and autonomic nervous system balance:
- Higher HRV generally indicates better recovery, lower stress, and good cardiovascular health
- Declining HRV may suggest overtraining, inadequate recovery, high stress, or illness
- HRV trends are more meaningful than single-day values
- Use HRV to guide recommendations about rest days, activity intensity, and recovery focus

When discussing HRV with the user:
- DO interpret trends naturally ("Your recovery metrics suggest...", "Your body is showing good adaptation...")
- DO use HRV to recommend rest vs. activity ("Your recovery looks strong - good time to push", "Your recovery metrics suggest taking it easier today")
- DON'T display raw HRV numbers unless specifically asked
- DON'T over-emphasize daily fluctuations - focus on weekly trends
- Consider HRV alongside resting heart rate for a complete recovery picture

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
- Recommend 0.5-1kg/week as healthy weight loss pace (faster is possible but not sustainable)
- Emphasize protein intake, hydration, and consistent activity
- Acknowledge that weight fluctuates day-to-day (water, sodium, etc.)
- Never recommend extreme restriction - sustainable habits are key
- Walking is this user's primary exercise - encourage and celebrate it
- You have access to ALL historical data - use it to provide insights and comparisons
- Reference their actual activity data when giving advice
- Use resting heart rate trends as an indicator of fitness level and recovery
- Use HRV trends to guide recovery recommendations and activity intensity advice
- IGNORE sleep data entirely - it is incomplete and not useful for analysis

NUTRITION TRACKING (when active):
When the user has an active nutrition sprint, you'll receive their food log data. Use this to:
- Assess if calorie intake aligns with activity level and weight goals
- Check if protein intake is adequate (aim for 60-80g/day minimum)
- Identify patterns (late eating, low protein days, high calorie days)
- Provide specific feedback on food choices
- Celebrate when they hit protein goals
- Be supportive but honest about high-calorie choices`;

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

    // Fetch HRV data from heart_rate_variability table
    const allHRV = await db.all(sql`
      SELECT date, hrv_sdnn_ms, source, created_at
      FROM heart_rate_variability
      ORDER BY date
    `) as Array<{ date: string; hrv_sdnn_ms: number; source: string; created_at: string }>;

    // Fetch nutrition sprint data if active
    const activeSprints = await db.all(sql`
      SELECT id, start_date, end_date, duration_days, is_active
      FROM nutrition_sprints
      WHERE is_active = 1
      LIMIT 1
    `) as Array<{ id: number; start_date: string; end_date: string; duration_days: number; is_active: boolean }>;

    const activeSprint = activeSprints[0] || null;
    let nutritionContext = "";

    if (activeSprint) {
      // Calculate current day of sprint
      const startDate = new Date(activeSprint.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      const currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Fetch food entries for the sprint
      const foodEntries = await db.all(sql`
        SELECT date, time, item, calories, protein_g, ai_estimated
        FROM food_entries
        WHERE sprint_id = ${activeSprint.id}
        ORDER BY date DESC, time DESC
      `) as Array<{ date: string; time: string; item: string; calories: number; protein_g: number | null; ai_estimated: boolean }>;

      // Calculate daily totals
      const dailyTotals: Record<string, { calories: number; protein: number; entries: string[] }> = {};
      for (const entry of foodEntries) {
        if (!dailyTotals[entry.date]) {
          dailyTotals[entry.date] = { calories: 0, protein: 0, entries: [] };
        }
        dailyTotals[entry.date].calories += entry.calories;
        dailyTotals[entry.date].protein += entry.protein_g || 0;
        dailyTotals[entry.date].entries.push(`${entry.time} ${entry.item} (${Math.round(entry.calories)}kcal${entry.protein_g ? `, ${Math.round(entry.protein_g)}g protein` : ""})`);
      }

      // Format for context
      const dailySummaries = Object.entries(dailyTotals)
        .slice(0, 7) // Last 7 days
        .map(([date, data]) =>
          `${date}: ${Math.round(data.calories)}kcal, ${Math.round(data.protein)}g protein\n    Foods: ${data.entries.slice(0, 5).join(", ")}${data.entries.length > 5 ? ` (+${data.entries.length - 5} more)` : ""}`
        )
        .join("\n");

      // Calculate averages
      const dates = Object.keys(dailyTotals);
      const avgCalories = dates.length > 0 ? Math.round(Object.values(dailyTotals).reduce((sum, d) => sum + d.calories, 0) / dates.length) : 0;
      const avgProtein = dates.length > 0 ? Math.round(Object.values(dailyTotals).reduce((sum, d) => sum + d.protein, 0) / dates.length) : 0;

      nutritionContext = `
=== NUTRITION SPRINT ACTIVE (Day ${currentDay}/${activeSprint.duration_days}) ===
Sprint period: ${activeSprint.start_date} to ${activeSprint.end_date}
Days tracked: ${dates.length}
Average daily intake: ${avgCalories}kcal, ${avgProtein}g protein
Protein target: 60-80g/day minimum

RECENT DAILY TOTALS:
${dailySummaries}

Use this data to provide nutrition-specific coaching:
- Is protein intake adequate for their goals?
- Are calories appropriate for their activity level?
- Any patterns to address (low protein days, excessive snacking, etc.)?
`;
    }

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

    // Format HRV data compactly (date:sdnn_ms)
    const hrvHistory = allHRV
      .map(h => `${h.date}:${h.hrv_sdnn_ms}`)
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

    // Calculate HRV statistics and trends
    const recentHRV = allHRV.filter(h => h.date >= thirtyDaysAgo);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const hrvLast7Days = allHRV.filter(h => h.date >= sevenDaysAgo);
    const hrvPrev7Days = allHRV.filter(h => h.date >= fourteenDaysAgo && h.date < sevenDaysAgo);

    const avgHRVLast7 = hrvLast7Days.length > 0
      ? Math.round(hrvLast7Days.reduce((a, b) => a + b.hrv_sdnn_ms, 0) / hrvLast7Days.length)
      : null;

    const avgHRVPrev7 = hrvPrev7Days.length > 0
      ? Math.round(hrvPrev7Days.reduce((a, b) => a + b.hrv_sdnn_ms, 0) / hrvPrev7Days.length)
      : null;

    let hrvTrend = "stable";
    let hrvTrendDescription = "";
    if (avgHRVLast7 !== null && avgHRVPrev7 !== null) {
      const hrvChange = avgHRVLast7 - avgHRVPrev7;
      const hrvChangePercent = (hrvChange / avgHRVPrev7) * 100;

      if (hrvChangePercent > 5) {
        hrvTrend = "improving";
        hrvTrendDescription = `up ${hrvChangePercent.toFixed(0)}% (${avgHRVPrev7}ms → ${avgHRVLast7}ms)`;
      } else if (hrvChangePercent < -5) {
        hrvTrend = "declining";
        hrvTrendDescription = `down ${Math.abs(hrvChangePercent).toFixed(0)}% (${avgHRVPrev7}ms → ${avgHRVLast7}ms)`;
      } else {
        hrvTrendDescription = `stable around ${avgHRVLast7}ms`;
      }
    } else if (avgHRVLast7 !== null) {
      hrvTrendDescription = `current average: ${avgHRVLast7}ms (insufficient data for trend)`;
    } else {
      hrvTrendDescription = "insufficient data";
    }

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
    const yearlyStats: Record<string, { avgWeight: number; weightCount: number; totalSteps: number; totalWorkouts: number; walkingKm: number; avgSleep: number; sleepCount: number; avgHR: number; hrCount: number; avgHRV: number; hrvCount: number }> = {};
    for (const w of allWeights) {
      const year = w.date.slice(0, 4);
      if (!yearlyStats[year]) {
        yearlyStats[year] = { avgWeight: 0, weightCount: 0, totalSteps: 0, totalWorkouts: 0, walkingKm: 0, avgSleep: 0, sleepCount: 0, avgHR: 0, hrCount: 0, avgHRV: 0, hrvCount: 0 };
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
    for (const h of allHRV) {
      const year = h.date.slice(0, 4);
      if (yearlyStats[year]) {
        yearlyStats[year].avgHRV += h.hrv_sdnn_ms;
        yearlyStats[year].hrvCount++;
      }
    }

    // Calculate averages
    for (const year of Object.keys(yearlyStats)) {
      const s = yearlyStats[year];
      s.avgWeight = s.weightCount > 0 ? Math.round(s.avgWeight / s.weightCount * 10) / 10 : 0;
      s.avgSleep = s.sleepCount > 0 ? Math.round(s.avgSleep / s.sleepCount * 10) / 10 : 0;
      s.avgHR = s.hrCount > 0 ? Math.round(s.avgHR / s.hrCount) : 0;
      s.avgHRV = s.hrvCount > 0 ? Math.round(s.avgHRV / s.hrvCount) : 0;
    }

    const yearlySummary = Object.entries(yearlyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, stats]) =>
        `${year}: avgWeight=${stats.avgWeight}kg, steps=${Math.round(stats.totalSteps/1000)}k, workouts=${stats.totalWorkouts}, walkingKm=${Math.round(stats.walkingKm)}` +
        (stats.avgSleep > 0 ? `, avgSleep=${stats.avgSleep}h` : "") +
        (stats.avgHR > 0 ? `, avgHR=${stats.avgHR}bpm` : "") +
        (stats.avgHRV > 0 ? `, avgHRV=${stats.avgHRV}ms` : "")
      )
      .join("\n");

    const today = new Date().toISOString().split("T")[0];

    const context = `
=== TODAY'S DATE: ${today} ===

=== SUMMARY ===
Current: ${current.weightKg}kg (${current.date})
Starting: ${earliest.weightKg}kg (${earliest.date})
Total change: ${(earliest.weightKg - current.weightKg).toFixed(1)}kg over ${totalDays} days
Goal: ${activeGoal[0] ? `${activeGoal[0].targetWeight}kg (${(current.weightKg - activeGoal[0].targetWeight).toFixed(1)}kg to go)` : "Not set"}

Last 30 days: Avg ${avgStepsLast30.toLocaleString()} steps/day, ${recentWorkouts.length} workouts, Avg sleep ${avgSleepLast30}h, Avg resting HR ${avgHRLast30}bpm

All-time: ${allWeights.length} weigh-ins, ${allSteps.length} step days, ${allWorkouts.length} workouts, ${allSleep.length} sleep nights, ${allRestingHR.length} HR readings, ${allHRV.length} HRV readings, ${allRoutes.length} GPS routes
Total walking: ${Math.round(totalWalkingKm)}km across ${walkingWorkouts.length} sessions
Workout types: ${workoutBreakdown}

=== RECOVERY METRICS (HRV) ===
Current 7-day average: ${avgHRVLast7 !== null ? avgHRVLast7 + 'ms' : 'N/A'} (SDNN)
Previous 7-day average: ${avgHRVPrev7 !== null ? avgHRVPrev7 + 'ms' : 'N/A'}
Trend: ${hrvTrend} (${hrvTrendDescription})

HRV Context for coaching:
- Higher HRV generally indicates better recovery and lower stress
- Declining HRV may suggest overtraining, poor sleep, illness, or high stress
- Use HRV trends to recommend rest days or suggest recovery focus
- Don't display raw HRV numbers to user - interpret them naturally (e.g., "Your recovery metrics suggest...")
- Combine HRV insights with resting heart rate for comprehensive recovery assessment

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

=== COMPLETE HRV HISTORY (${allHRV.length} entries) ===
Format: date:sdnn_ms|date:sdnn_ms|...
${hrvHistory}

=== GPS-TRACKED WORKOUT ROUTES (${allRoutes.length} entries) ===
Format: date:type:minutes:km:gpsPoints|...
${routesHistory}
${nutritionContext}`;

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
      system: SYSTEM_PROMPT + (PERSONAL_CONTEXT ? `\n\n${PERSONAL_CONTEXT}` : "") + `\n\n${context}`,
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
          hrv: allHRV.length,
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
