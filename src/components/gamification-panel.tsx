"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Star, Target, CheckCircle2, Circle } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

interface Quest {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  completed: boolean;
  progress?: number;
  target?: number;
}

interface GameState {
  xp: number;
  level: number;
  streak: number;
  lastWeighDate: string | null;
  badges: Badge[];
  dailyQuests: Quest[];
}

interface GamificationPanelProps {
  gameState: GameState | null;
}

export function GamificationPanel({ gameState }: GamificationPanelProps) {
  if (!gameState) return null;

  const xpInCurrentLevel = gameState.xp % 100;
  const xpToNextLevel = 100;

  return (
    <div className="space-y-4">
      {/* Level & XP Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Level {gameState.level}
            </CardTitle>
            <span className="text-sm text-muted-foreground">{gameState.xp} XP total</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={(xpInCurrentLevel / xpToNextLevel) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {xpInCurrentLevel} / {xpToNextLevel} XP to level {gameState.level + 1}
          </p>
        </CardContent>
      </Card>

      {/* Streak Card */}
      <Card className={gameState.streak >= 3 ? "border-orange-400 bg-orange-50/50" : ""}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Flame className={`h-8 w-8 ${gameState.streak >= 3 ? "text-orange-500" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold text-lg">{gameState.streak} Day Streak</p>
              <p className="text-xs text-muted-foreground">
                {gameState.streak >= 7
                  ? "Amazing dedication! 🔥"
                  : gameState.streak >= 3
                  ? "Keep it going!"
                  : "Build your streak by logging daily"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Quests */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Daily Quests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {gameState.dailyQuests.map((quest) => (
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

      {/* Badges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Badges ({gameState.badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {gameState.badges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-full"
                title={badge.description}
              >
                <span>{badge.icon}</span>
                <span className="text-xs font-medium">{badge.name}</span>
              </div>
            ))}
            {gameState.badges.length === 0 && (
              <p className="text-sm text-muted-foreground">No badges yet. Keep tracking!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
