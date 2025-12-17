"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeightActivityChart } from "@/components/weight-activity-chart";
import { ActivityPanel } from "@/components/activity-panel";
import { HeroSection } from "@/components/dashboard/hero-section";
import { TabContainer } from "@/components/dashboard/tab-container";
import { SettingsModal } from "@/components/dashboard/settings-modal";
import { DailyCheckinModal } from "@/components/dashboard/daily-checkin-modal";
import { FloatingActionButton } from "@/components/dashboard/floating-action-button";
import { CelebrationModal, checkForCelebrations } from "@/components/gamification/celebration-modal";
import { BadgeShowcase } from "@/components/gamification/badge-showcase";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import { AICoachPanel } from "@/components/ai-coach/ai-coach-panel";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Settings,
  Lightbulb,
  Star,
  Target,
  CheckCircle2,
  Circle,
  Flame,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface Weight {
  id: number;
  date: string;
  weightKg: number;
  source: string;
}

interface Stats {
  current: number;
  starting: number;
  goal: number | null;
  totalLost: number;
  weekChange: number | null;
  monthChange: number | null;
  toGoal: number | null;
  latestDate: string;
}

interface Milestone {
  type: string;
  message: string;
  importance: "high" | "medium" | "low";
}

interface Analysis {
  currentWeight: number;
  goalWeight: number | null;
  milestones: Milestone[];
  trends: {
    weeklyChange: number;
    monthlyChange: number;
    threeMonthChange: number;
    yearlyChange: number;
    trend: "losing" | "gaining" | "stable";
    predictedGoalDate: string | null;
  };
  insights: string[];
  historicalComparisons: Array<{ date: string; weight: number; message: string }>;
}

interface GameState {
  xp: number;
  level: number;
  streak: number;
  lastWeighDate: string | null;
  badges: Array<{ id: string; name: string; description: string; icon: string; earnedAt?: string }>;
  dailyQuests: Array<{ id: string; name: string; description: string; xpReward: number; completed: boolean; progress?: number; target?: number }>;
}

interface Entry {
  date: string;
  notes: string | null;
  energyLevel: number | null;
  fastingHours: number | null;
}

interface StepData {
  date: string;
  stepCount: number;
}

interface WorkoutData {
  date: string;
  activityType: string;
  durationMinutes: number;
  distanceKm: number | null;
}

interface ActivityStats {
  todaySteps: number;
  weekAvgSteps: number;
  monthAvgSteps: number;
  totalWorkouts: number;
  walkingWorkouts: number;
  stepsStreak: number;
  activeMinutesThisWeek: number;
  activeMinutesLastWeek: number;
  correlations: { type: "positive" | "negative" | "neutral"; message: string; detail?: string }[];
  workoutsByType: { type: string; count: number; totalMinutes: number; totalKm: number }[];
  recentWorkouts: { date: string; type: string; duration: number; distance: number | null }[];
  recentSteps: { date: string; steps: number }[];
}

interface CelebrationData {
  type: "levelUp" | "badgeEarned" | "streakMilestone" | "goalReached";
  title: string;
  message: string;
  icon?: string;
  value?: number | string;
}

export default function Home() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [prevGameState, setPrevGameState] = useState<GameState | null>(null);
  const [todayEntry, setTodayEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<string>>(new Set());

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    // Load dismissed milestones
    const savedDismissed = localStorage.getItem("wt-dismissed-milestones");
    if (savedDismissed) {
      try {
        setDismissedMilestones(new Set(JSON.parse(savedDismissed)));
      } catch {
        // Ignore parse errors
      }
    }

    // Fetch all data including activity and settings
    Promise.all([
      fetch("/api/weights").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/analysis").then((r) => r.json()),
      fetch("/api/game").then((r) => r.json()),
      fetch("/api/entries").then((r) => r.json()),
      fetch("/api/steps").then((r) => r.json()),
      fetch("/api/workouts").then((r) => r.json()),
      fetch("/api/activity-stats").then((r) => r.json()),
      fetch("/api/settings?key=anthropic_api_key").then((r) => r.json()),
    ]).then(([weightsData, statsData, analysisData, gameData, entriesData, stepsData, workoutsData, activityStatsData, apiKeyData]) => {
      setWeights(weightsData);
      setStats(statsData);
      setAnalysis(analysisData);
      setGameState(gameData);
      setSteps(stepsData);
      setWorkouts(workoutsData);
      setActivityStats(activityStatsData);
      // Load API key from database
      if (apiKeyData.value) setApiKey(apiKeyData.value);
      // Find today's entry
      const todayEntryData = entriesData.find((e: Entry) => e.date === today);
      setTodayEntry(todayEntryData || null);
      setLoading(false);
    });
  }, [today]);

  // Check for celebrations when game state changes
  useEffect(() => {
    if (gameState && prevGameState) {
      const newCelebration = checkForCelebrations(prevGameState, gameState);
      if (newCelebration) {
        setCelebration(newCelebration);
      }
    }
  }, [gameState, prevGameState]);

  const saveApiKey = async (key: string) => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "anthropic_api_key", value: key }),
    });
    setApiKey(key);
    setShowSettings(false);
  };

  const setGoal = async (weight: number) => {
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetWeight: weight }),
    });
    const [statsData, analysisData] = await Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/analysis").then((r) => r.json()),
    ]);
    setStats(statsData);
    setAnalysis(analysisData);
  };

  const saveEntry = async (entry: Partial<Entry>) => {
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    setPrevGameState(gameState);
    const [gameData, entriesData] = await Promise.all([
      fetch("/api/game").then((r) => r.json()),
      fetch("/api/entries").then((r) => r.json()),
    ]);
    setGameState(gameData);
    const todayEntryData = entriesData.find((e: Entry) => e.date === today);
    setTodayEntry(todayEntryData || null);
  };

  const logWeight = async (weight: number, date: string, notes?: string) => {
    await fetch("/api/weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg: weight, date, source: "manual", notes }),
    });
    setPrevGameState(gameState);
    const [weightsData, statsData, analysisData, gameData] = await Promise.all([
      fetch("/api/weights").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/analysis").then((r) => r.json()),
      fetch("/api/game").then((r) => r.json()),
    ]);
    setWeights(weightsData);
    setStats(statsData);
    setAnalysis(analysisData);
    setGameState(gameData);
  };

  const dismissMilestone = (message: string) => {
    const newDismissed = new Set(dismissedMilestones);
    newDismissed.add(message);
    setDismissedMilestones(newDismissed);
    localStorage.setItem("wt-dismissed-milestones", JSON.stringify([...newDismissed]));
  };

  if (loading) {
    return (
      <main className="container mx-auto p-4 max-w-6xl">
        <div className="animate-pulse text-center py-12">Loading your weight data...</div>
      </main>
    );
  }

  const highPriorityMilestones = analysis?.milestones
    .filter((m) => m.importance === "high" && !dismissedMilestones.has(m.message)) || [];

  const weighDates = weights.map(w => w.date);

  // Gamification content for tab
  const gamificationContent = (
    <div className="space-y-4">
      {/* Level & XP */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-xp-gold" />
              Level {gameState?.level || 1}
            </CardTitle>
            <span className="text-sm text-muted-foreground">{gameState?.xp || 0} XP total</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={((gameState?.xp || 0) % 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {(gameState?.xp || 0) % 100} / 100 XP to level {(gameState?.level || 1) + 1}
          </p>
        </CardContent>
      </Card>

      {/* Streak Calendar */}
      <StreakCalendar currentStreak={gameState?.streak || 0} weighDates={weighDates} />

      {/* Daily Quests */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Daily Quests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {gameState?.dailyQuests.map((quest) => (
            <div
              key={quest.id}
              className={`flex items-center justify-between p-2 rounded ${
                quest.completed ? "bg-green-50" : "bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {quest.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className={`text-sm ${quest.completed ? "line-through text-muted-foreground" : ""}`}>
                    {quest.name}
                  </p>
                  {quest.progress !== undefined && quest.target && !quest.completed && (
                    <p className="text-xs text-muted-foreground">
                      {quest.progress}/{quest.target}
                    </p>
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium ${quest.completed ? "text-green-600" : "text-muted-foreground"}`}>
                +{quest.xpReward} XP
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Badge Showcase */}
      <BadgeShowcase earnedBadges={gameState?.badges || []} />
    </div>
  );

  // Insights content for tab
  const insightsContent = (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis?.insights.map((insight, i) => (
            <p key={i} className="text-sm">
              {insight}
            </p>
          ))}
          {analysis?.historicalComparisons.slice(0, 2).map((comp, i) => (
            <p key={`comp-${i}`} className="text-sm text-muted-foreground">
              📅 {comp.message}
            </p>
          ))}
          {(!analysis?.insights.length && !analysis?.historicalComparisons.length) && (
            <p className="text-sm text-muted-foreground">
              Keep logging to unlock insights!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className={`text-lg font-semibold ${analysis?.trends.weeklyChange && analysis.trends.weeklyChange < 0 ? "text-weight-loss" : analysis?.trends.weeklyChange && analysis.trends.weeklyChange > 0 ? "text-weight-gain" : ""}`}>
                {analysis?.trends.weeklyChange !== undefined
                  ? `${analysis.trends.weeklyChange > 0 ? "+" : ""}${analysis.trends.weeklyChange.toFixed(1)} kg`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className={`text-lg font-semibold ${analysis?.trends.monthlyChange && analysis.trends.monthlyChange < 0 ? "text-weight-loss" : analysis?.trends.monthlyChange && analysis.trends.monthlyChange > 0 ? "text-weight-gain" : ""}`}>
                {analysis?.trends.monthlyChange !== undefined
                  ? `${analysis.trends.monthlyChange > 0 ? "+" : ""}${analysis.trends.monthlyChange.toFixed(1)} kg`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">3 Months</p>
              <p className={`text-lg font-semibold ${analysis?.trends.threeMonthChange && analysis.trends.threeMonthChange < 0 ? "text-weight-loss" : analysis?.trends.threeMonthChange && analysis.trends.threeMonthChange > 0 ? "text-weight-gain" : ""}`}>
                {analysis?.trends.threeMonthChange !== undefined
                  ? `${analysis.trends.threeMonthChange > 0 ? "+" : ""}${analysis.trends.threeMonthChange.toFixed(1)} kg`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Year</p>
              <p className={`text-lg font-semibold ${analysis?.trends.yearlyChange && analysis.trends.yearlyChange < 0 ? "text-weight-loss" : analysis?.trends.yearlyChange && analysis.trends.yearlyChange > 0 ? "text-weight-gain" : ""}`}>
                {analysis?.trends.yearlyChange !== undefined
                  ? `${analysis.trends.yearlyChange > 0 ? "+" : ""}${analysis.trends.yearlyChange.toFixed(1)} kg`
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
          <CardDescription>
            {weights.length} total records • Data synced from Apple Health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {weights.slice(0, 10).map((w, i) => {
              const prevWeight = weights[i + 1]?.weightKg;
              const change = prevWeight ? w.weightKg - prevWeight : null;
              return (
                <div
                  key={w.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(w.date), "MMM d, yyyy")}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded">{w.source}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {change !== null && (
                      <span
                        className={`text-xs ${
                          change < 0 ? "text-weight-loss" : change > 0 ? "text-weight-gain" : "text-muted-foreground"
                        }`}
                      >
                        {change > 0 ? "+" : ""}
                        {change.toFixed(1)}
                      </span>
                    )}
                    <span className="font-medium">{w.weightKg.toFixed(1)} kg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Weight Tracker</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Hero Section */}
      <HeroSection
        stats={stats}
        gameState={gameState}
        hasCheckedInToday={!!todayEntry}
        onLogWeight={() => {}}
        onCheckIn={() => setShowCheckin(true)}
      />

      {/* Milestones Banner */}
      {highPriorityMilestones.length > 0 && (
        <Card className="mb-6 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Trophy className="h-6 w-6 text-yellow-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Milestone Achieved!</h3>
                  {highPriorityMilestones.map((m, i) => (
                    <p key={i} className="text-yellow-700">
                      {m.message}
                    </p>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
                onClick={() => highPriorityMilestones.forEach(m => dismissMilestone(m.message))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart - Full Width */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Progress
            <span
              className={`text-sm font-normal ${
                analysis?.trends.trend === "losing"
                  ? "text-weight-loss"
                  : analysis?.trends.trend === "gaining"
                  ? "text-weight-gain"
                  : "text-muted-foreground"
              }`}
            >
              {analysis?.trends.trend === "losing"
                ? "📉 Trending down"
                : analysis?.trends.trend === "gaining"
                ? "📈 Trending up"
                : "Stable"}
            </span>
          </CardTitle>
          <CardDescription>
            Weight trend with activity data overlay
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weights.length > 0 ? (
            <WeightActivityChart
              weights={weights}
              steps={steps}
              workouts={workouts}
              goalWeight={stats?.goal ?? undefined}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">No weight data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <TabContainer
        activityContent={<ActivityPanel stats={activityStats} />}
        insightsContent={insightsContent}
        coachContent={
          <AICoachPanel
            apiKey={apiKey}
            onApiKeyMissing={() => setShowSettings(true)}
            weightCount={weights.length}
            workoutCount={activityStats?.totalWorkouts || 0}
          />
        }
        gamificationContent={gamificationContent}
      />

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        Data from Apple Health • Re-import anytime with the import script
      </p>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        apiKey={apiKey}
        onSaveApiKey={saveApiKey}
        currentGoal={stats?.goal || null}
        onSaveGoal={setGoal}
      />

      <DailyCheckinModal
        isOpen={showCheckin}
        onClose={() => setShowCheckin(false)}
        todayEntry={todayEntry}
        onSave={saveEntry}
      />

      <CelebrationModal
        celebration={celebration}
        onClose={() => setCelebration(null)}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        currentWeight={stats?.current}
        onSubmit={logWeight}
      />
    </main>
  );
}
