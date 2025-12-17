"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Scale, CheckCircle2, TrendingDown, TrendingUp, Minus, Flame, Star, Gem } from "lucide-react";
import { format } from "date-fns";

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

interface GameState {
  xp: number;
  level: number;
  streak: number;
  lastWeighDate: string | null;
  badges: Array<{ id: string; name: string; description: string; icon: string; earnedAt?: string }>;
  dailyQuests: Array<{ id: string; name: string; description: string; xpReward: number; completed: boolean; progress?: number; target?: number }>;
}

interface HeroSectionProps {
  stats: Stats | null;
  gameState: GameState | null;
  hasCheckedInToday: boolean;
  onLogWeight: () => void;
  onCheckIn: () => void;
}

export function HeroSection({ stats, gameState, hasCheckedInToday, onLogWeight, onCheckIn }: HeroSectionProps) {
  const progressToGoal = stats?.goal && stats?.toGoal !== null
    ? Math.max(0, Math.min(100, ((stats.totalLost) / (stats.starting - stats.goal)) * 100))
    : 0;

  const xpInCurrentLevel = gameState ? gameState.xp % 100 : 0;

  const getTrendIcon = () => {
    if (!stats?.weekChange) return <Minus className="h-5 w-5 text-muted-foreground" />;
    if (stats.weekChange < -0.1) return <TrendingDown className="h-5 w-5 text-weight-loss" />;
    if (stats.weekChange > 0.1) return <TrendingUp className="h-5 w-5 text-weight-gain" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getWeekChangeText = () => {
    if (!stats?.weekChange) return "No change this week";
    const sign = stats.weekChange > 0 ? "+" : "";
    return `${sign}${stats.weekChange.toFixed(1)} kg this week`;
  };

  return (
    <Card className="border-l-4 border-primary shadow-lg bg-gradient-to-br from-white to-primary/5 mb-6">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-bold font-mono tracking-tight">
              {stats ? stats.current.toFixed(1) : "--.-"}
            </span>
            <span className="text-2xl text-muted-foreground">kg</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm">
            {getTrendIcon()}
            <span className={
              stats?.weekChange && stats.weekChange < -0.1 ? "text-weight-loss" :
              stats?.weekChange && stats.weekChange > 0.1 ? "text-weight-gain" :
              "text-muted-foreground"
            }>
              {getWeekChangeText()}
            </span>
          </div>
          {stats?.latestDate && (
            <p className="text-xs text-muted-foreground mt-1">
              as of {format(new Date(stats.latestDate), "MMM d, yyyy")}
            </p>
          )}
        </div>

        {/* Progress to Goal */}
        {stats?.goal && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to Goal</span>
              <span className="font-medium">{progressToGoal.toFixed(0)}%</span>
            </div>
            <Progress value={progressToGoal} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{stats.totalLost.toFixed(1)} kg lost</span>
              <span>{stats.toGoal?.toFixed(1)} kg to go ({stats.goal} kg target)</span>
            </div>
          </div>
        )}

        {/* Gamification Stats Row */}
        <div className="flex justify-center gap-6 mb-6 py-3 bg-muted/30 rounded-lg">
          {gameState && gameState.streak > 0 && (
            <div className="flex items-center gap-2">
              <Flame className={`h-5 w-5 ${gameState.streak >= 3 ? "text-streak-fire" : "text-muted-foreground"}`} />
              <span className="font-medium">{gameState.streak} Day Streak</span>
            </div>
          )}
          {gameState && (
            <>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-xp-gold" />
                <span className="font-medium">Level {gameState.level}</span>
              </div>
              <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-level-purple" />
                <span className="font-medium">{xpInCurrentLevel}/100 XP</span>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button onClick={onLogWeight} className="flex-1" size="lg">
            <Scale className="h-4 w-4 mr-2" />
            Log Weight
          </Button>
          <Button
            onClick={onCheckIn}
            variant={hasCheckedInToday ? "outline" : "default"}
            className="flex-1"
            size="lg"
          >
            {hasCheckedInToday ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
                Checked In
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Daily Check-in
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
