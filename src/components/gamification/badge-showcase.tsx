"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Lock } from "lucide-react";
import { format } from "date-fns";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

// All possible badges in the system
const ALL_BADGES: Omit<Badge, "earnedAt">[] = [
  { id: "first-entry", name: "First Steps", description: "Log your first weight entry", icon: "🌟" },
  { id: "week-streak-3", name: "Consistency", description: "Maintain a 3-day streak", icon: "🔥" },
  { id: "week-streak-7", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "💪" },
  { id: "week-streak-30", name: "Monthly Master", description: "Maintain a 30-day streak", icon: "👑" },
  { id: "lost-1kg", name: "First Kilo", description: "Lose your first kilogram", icon: "⬇️" },
  { id: "lost-5kg", name: "Halfway Hero", description: "Lose 5 kilograms", icon: "🎯" },
  { id: "lost-10kg", name: "Ten Down", description: "Lose 10 kilograms", icon: "🏆" },
  { id: "lost-20kg", name: "Transform", description: "Lose 20 kilograms", icon: "🌈" },
  { id: "goal-reached", name: "Goal Getter", description: "Reach your target weight", icon: "🎉" },
  { id: "data-veteran", name: "Data Veteran", description: "Log 100 weight entries", icon: "📊" },
  { id: "year-tracker", name: "Year Tracker", description: "Track weight for a full year", icon: "📅" },
];

interface BadgeShowcaseProps {
  earnedBadges: Badge[];
}

export function BadgeShowcase({ earnedBadges }: BadgeShowcaseProps) {
  const earnedBadgeIds = new Set(earnedBadges.map(b => b.id));
  const earnedCount = earnedBadges.length;
  const totalCount = ALL_BADGES.length;

  // Combine earned badges with locked badges
  const allBadgesWithStatus = ALL_BADGES.map(badge => {
    const earned = earnedBadges.find(b => b.id === badge.id);
    return {
      ...badge,
      earned: !!earned,
      earnedAt: earned?.earnedAt,
    };
  });

  // Sort: earned first, then by name
  allBadgesWithStatus.sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-xp-gold" />
            Badges
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {earnedCount}/{totalCount} earned
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {allBadgesWithStatus.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={badge.earned ? { scale: 1.05 } : undefined}
              className={`
                relative aspect-square rounded-xl p-3 flex flex-col items-center justify-center text-center
                transition-all duration-200
                ${badge.earned
                  ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-sm hover:shadow-md cursor-pointer"
                  : "bg-muted/50 border border-dashed border-muted-foreground/30"
                }
              `}
              title={badge.earned ? `${badge.name}: ${badge.description}` : `Locked: ${badge.description}`}
            >
              {badge.earned ? (
                <>
                  <span className="text-3xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-medium leading-tight">{badge.name}</span>
                  {badge.earnedAt && (
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(badge.earnedAt), "MMM d")}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Lock className="h-6 w-6 text-muted-foreground/50 mb-1" />
                  <span className="text-xs text-muted-foreground/70">???</span>
                </>
              )}

              {/* Glow effect for earned badges */}
              {badge.earned && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-400/10 to-orange-400/10 pointer-events-none" />
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
