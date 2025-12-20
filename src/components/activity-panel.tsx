"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footprints, Timer, TrendingUp, TrendingDown, Minus, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ActivityStats {
  todaySteps: number;
  weekAvgSteps: number;
  monthAvgSteps: number;
  totalWorkouts: number;
  walkingWorkouts: number;
  stepsStreak: number;
  activeMinutesThisWeek: number;
  activeMinutesLastWeek: number;
  totalFlights?: number;
  correlations: { type: "positive" | "negative" | "neutral"; message: string; detail?: string }[];
  workoutsByType: { type: string; count: number; totalMinutes: number; totalKm: number }[];
  recentWorkouts: { date: string; type: string; duration: number; distance: number | null; calories?: number | null }[];
  recentSteps: { date: string; steps: number }[];
}

interface ActivityPanelProps {
  stats: ActivityStats | null;
}

export function ActivityPanel({ stats }: ActivityPanelProps) {
  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading activity data...</p>
        </CardContent>
      </Card>
    );
  }

  const weekTrend = stats.activeMinutesThisWeek - stats.activeMinutesLastWeek;
  const stepsTrend = stats.weekAvgSteps > stats.monthAvgSteps;

  return (
    <div className="space-y-4">
      {/* Activity Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Footprints className="h-4 w-4" />
              Today
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats.todaySteps.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">steps</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Footprints className="h-4 w-4" />
              Week Avg
            </div>
            <p className="text-2xl font-bold mt-1 flex items-center gap-1">
              {stats.weekAvgSteps.toLocaleString()}
              {stepsTrend ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </p>
            <p className="text-xs text-muted-foreground">steps/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Timer className="h-4 w-4" />
              This Week
            </div>
            <p className="text-2xl font-bold mt-1 flex items-center gap-1">
              {stats.activeMinutesThisWeek}
              {weekTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : weekTrend < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </p>
            <p className="text-xs text-muted-foreground">active minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Footprints className="h-4 w-4" />
              Streak
            </div>
            <p className="text-2xl font-bold mt-1">{stats.stepsStreak}</p>
            <p className="text-xs text-muted-foreground">days 5k+ steps</p>
          </CardContent>
        </Card>

        {stats.totalFlights !== undefined && stats.totalFlights > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                Flights Climbed
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalFlights.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total flights</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Correlations & Insights */}
      {stats.correlations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity & Weight Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.correlations.map((insight, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  insight.type === "positive"
                    ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                    : insight.type === "negative"
                    ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                    : "bg-muted"
                }`}
              >
                <p className="font-medium text-sm">{insight.message}</p>
                {insight.detail && (
                  <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Workout Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Workout Summary</span>
            <span className="text-sm font-normal text-muted-foreground">
              {stats.totalWorkouts} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.workoutsByType.slice(0, 5).map((workout) => (
              <div key={workout.type} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="capitalize font-medium">{workout.type}</span>
                  <span className="text-muted-foreground">({workout.count})</span>
                </div>
                <div className="text-right text-muted-foreground">
                  {Math.round(workout.totalMinutes / 60)}h
                  {workout.totalKm > 0 && ` / ${Math.round(workout.totalKm)} km`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Workouts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentWorkouts.slice(0, 5).map((workout, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="capitalize font-medium">{workout.type}</span>
                  <span className="text-muted-foreground">
                    {format(parseISO(workout.date), "MMM d")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {workout.duration}m
                  </span>
                  {workout.distance && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {workout.distance} km
                    </span>
                  )}
                  {workout.calories && (
                    <span>
                      {Math.round(workout.calories)} kcal
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
