"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeightActivityChart } from "@/components/weight-activity-chart";
import { GamificationPanel } from "@/components/gamification-panel";
import { LifestyleTracker } from "@/components/lifestyle-tracker";
import { ActivityPanel } from "@/components/activity-panel";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Target,
  Calendar,
  Trophy,
  Sparkles,
  Bot,
  Settings,
  RefreshCw,
  Award,
  Flame,
  Lightbulb,
  Send,
  Footprints,
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "same";
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-green-500 bg-green-50/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-green-600" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend === "down" && <TrendingDown className="h-4 w-4 text-green-500" />}
          {trend === "up" && <TrendingUp className="h-4 w-4 text-red-500" />}
          {trend === "same" && <Minus className="h-4 w-4 text-muted-foreground" />}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [todayEntry, setTodayEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [goalWeight, setGoalWeight] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
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

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const saveApiKey = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "anthropic_api_key", value: apiKey }),
    });
    setShowSettings(false);
  };

  const askCoach = async (question?: string) => {
    if (!apiKey) {
      setShowSettings(true);
      // Scroll to settings after state update
      setTimeout(() => {
        settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    const userMessage = question || chatInput.trim();
    if (!userMessage && chatMessages.length === 0) {
      // Initial request - get general advice
      setCoachLoading(true);
      try {
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey }),
        });
        const data = await response.json();
        if (data.error) {
          setChatMessages([{ role: "assistant", content: `Error: ${data.error}` }]);
        } else {
          setChatMessages([{ role: "assistant", content: data.message }]);
        }
      } catch {
        setChatMessages([{ role: "assistant", content: "Failed to get coaching advice. Please try again." }]);
      }
      setCoachLoading(false);
      return;
    }

    if (!userMessage) return;

    // Add user message to chat
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: userMessage }];
    setChatMessages(newMessages);
    setChatInput("");
    setCoachLoading(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          question: userMessage,
          conversationHistory: newMessages,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setChatMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setChatMessages([...newMessages, { role: "assistant", content: data.message }]);
      }
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Failed to get response. Please try again." }]);
    }
    setCoachLoading(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      askCoach(chatInput.trim());
    }
  };

  const setGoal = async () => {
    if (!goalWeight) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetWeight: goalWeight }),
    });
    // Refresh stats
    const [statsData, analysisData] = await Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/analysis").then((r) => r.json()),
    ]);
    setStats(statsData);
    setAnalysis(analysisData);
    setGoalWeight("");
  };

  const saveEntry = async (entry: Partial<Entry>) => {
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    // Refresh game state (completing daily reflection quest affects XP)
    const [gameData, entriesData] = await Promise.all([
      fetch("/api/game").then((r) => r.json()),
      fetch("/api/entries").then((r) => r.json()),
    ]);
    setGameState(gameData);
    const todayEntryData = entriesData.find((e: Entry) => e.date === today);
    setTodayEntry(todayEntryData || null);
  };

  if (loading) {
    return (
      <main className="container mx-auto p-4 max-w-6xl">
        <div className="animate-pulse text-center py-12">Loading your weight data...</div>
      </main>
    );
  }

  const getTrend = (change: number | null): "up" | "down" | "same" => {
    if (change === null) return "same";
    if (change < -0.1) return "down";
    if (change > 0.1) return "up";
    return "same";
  };

  const highPriorityMilestones = analysis?.milestones.filter((m) => m.importance === "high") || [];

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Weight Tracker</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card ref={settingsRef} className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Anthropic API Key (for AI Coach)</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1"
                />
                <Button onClick={saveApiKey}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from{" "}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener" className="underline">
                  console.anthropic.com
                </a>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Set Goal Weight</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  step="0.1"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  placeholder={stats?.goal ? `Current: ${stats.goal} kg` : "Target weight in kg"}
                  className="max-w-[200px]"
                />
                <Button onClick={setGoal}>Set Goal</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones Banner */}
      {highPriorityMilestones.length > 0 && (
        <Card className="mb-6 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="py-4">
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
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Current Weight"
          value={stats ? `${stats.current.toFixed(1)} kg` : "-"}
          subtitle={stats?.latestDate ? `as of ${format(new Date(stats.latestDate), "MMM d")}` : undefined}
          icon={Scale}
        />
        <StatCard
          title="Total Lost"
          value={stats ? `${stats.totalLost.toFixed(1)} kg` : "-"}
          subtitle={stats ? `from ${stats.starting.toFixed(1)} kg` : undefined}
          icon={Award}
          trend={stats && stats.totalLost > 0 ? "down" : "same"}
          highlight={stats ? stats.totalLost >= 10 : undefined}
        />
        <StatCard
          title="This Month"
          value={
            stats?.monthChange !== null && stats?.monthChange !== undefined
              ? `${stats.monthChange > 0 ? "+" : ""}${stats.monthChange.toFixed(1)} kg`
              : "-"
          }
          icon={Calendar}
          trend={stats ? getTrend(stats.monthChange) : "same"}
        />
        <StatCard
          title="To Goal"
          value={stats?.toGoal !== null && stats?.toGoal !== undefined ? `${stats.toGoal.toFixed(1)} kg` : "Set goal ↗"}
          subtitle={
            analysis?.trends.predictedGoalDate
              ? `Est. ${format(new Date(analysis.trends.predictedGoalDate), "MMM yyyy")}`
              : stats?.goal
              ? `target: ${stats.goal} kg`
              : undefined
          }
          icon={Target}
        />
      </div>

      {/* Chart - Full Width with Activity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Progress
            <span
              className={`text-sm font-normal ${
                analysis?.trends.trend === "losing"
                  ? "text-green-600"
                  : analysis?.trends.trend === "gaining"
                  ? "text-red-600"
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
            Weight trend with activity data overlay • Select timespan to explore your history
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

      {/* Activity & Insights - Two Column */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Activity Panel */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Activity
          </h2>
          <ActivityPanel stats={activityStats} />
        </div>

        {/* Insights Panel */}
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
      </div>

      {/* AI Coach - Interactive Chat */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Coach
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </CardTitle>
          <CardDescription>
            Get personalized advice powered by Claude • Ask questions about your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chatMessages.length > 0 ? (
            <div className="space-y-4">
              {/* Chat Messages */}
              <div className="max-h-96 overflow-y-auto space-y-4 p-4 bg-muted/50 rounded-lg">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {msg.content.split("\n").map((p, j) => (
                            <p key={j} className="mb-2 last:mb-0">{p}</p>
                          ))}
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {coachLoading && (
                  <div className="flex justify-start">
                    <div className="bg-background border rounded-lg p-3">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your weight, activity, tips..."
                  disabled={coachLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={coachLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Get personalized coaching based on your {weights.length} weight entries and {activityStats?.totalWorkouts || 0} workouts
              </p>
              <Button onClick={() => askCoach()} disabled={coachLoading} size="lg">
                {coachLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Chat with AI Coach
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gamification & Lifestyle - Two Column */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Gamification */}
        <GamificationPanel gameState={gameState} />

        {/* Daily Check-in */}
        <LifestyleTracker todayEntry={todayEntry} onSave={saveEntry} />
      </div>

      {/* Trend Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className={`text-lg font-semibold ${analysis?.trends.weeklyChange && analysis.trends.weeklyChange < 0 ? "text-green-600" : analysis?.trends.weeklyChange && analysis.trends.weeklyChange > 0 ? "text-red-600" : ""}`}>
                {analysis?.trends.weeklyChange !== undefined
                  ? `${analysis.trends.weeklyChange > 0 ? "+" : ""}${analysis.trends.weeklyChange.toFixed(1)} kg`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className={`text-lg font-semibold ${analysis?.trends.monthlyChange && analysis.trends.monthlyChange < 0 ? "text-green-600" : analysis?.trends.monthlyChange && analysis.trends.monthlyChange > 0 ? "text-red-600" : ""}`}>
                {analysis?.trends.monthlyChange !== undefined
                  ? `${analysis.trends.monthlyChange > 0 ? "+" : ""}${analysis.trends.monthlyChange.toFixed(1)} kg`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">3 Months</p>
              <p className={`text-lg font-semibold ${analysis?.trends.threeMonthChange && analysis.trends.threeMonthChange < 0 ? "text-green-600" : analysis?.trends.threeMonthChange && analysis.trends.threeMonthChange > 0 ? "text-red-600" : ""}`}>
                {analysis?.trends.threeMonthChange !== undefined
                  ? `${analysis.trends.threeMonthChange > 0 ? "+" : ""}${analysis.trends.threeMonthChange.toFixed(1)} kg`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Year</p>
              <p className={`text-lg font-semibold ${analysis?.trends.yearlyChange && analysis.trends.yearlyChange < 0 ? "text-green-600" : analysis?.trends.yearlyChange && analysis.trends.yearlyChange > 0 ? "text-red-600" : ""}`}>
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
          <div className="space-y-2">
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
                          change < 0 ? "text-green-600" : change > 0 ? "text-red-600" : "text-muted-foreground"
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

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        Data from Apple Health • Re-import anytime with the import script
      </p>
    </main>
  );
}
