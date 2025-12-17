import { db } from "./db";
import { weights, entries } from "./schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export interface GameState {
  xp: number;
  level: number;
  streak: number;
  lastWeighDate: string | null;
  badges: Badge[];
  dailyQuests: Quest[];
  recentAchievements: Achievement[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  completed: boolean;
  progress?: number;
  target?: number;
}

export interface Achievement {
  message: string;
  xp: number;
  timestamp: string;
}

const XP_PER_LEVEL = 100;

// Badge definitions
const BADGES: Record<string, Omit<Badge, "earnedAt">> = {
  "first-entry": {
    id: "first-entry",
    name: "Getting Started",
    description: "Logged your first weight",
    icon: "🌟",
  },
  "week-streak-3": {
    id: "week-streak-3",
    name: "Consistent",
    description: "3-day weigh-in streak",
    icon: "🔥",
  },
  "week-streak-7": {
    id: "week-streak-7",
    name: "Dedicated",
    description: "7-day weigh-in streak",
    icon: "💪",
  },
  "week-streak-30": {
    id: "week-streak-30",
    name: "Habit Master",
    description: "30-day weigh-in streak",
    icon: "👑",
  },
  "lost-1kg": {
    id: "lost-1kg",
    name: "First Kilo",
    description: "Lost 1 kg from starting weight",
    icon: "⬇️",
  },
  "lost-5kg": {
    id: "lost-5kg",
    name: "Making Progress",
    description: "Lost 5 kg from starting weight",
    icon: "🎯",
  },
  "lost-10kg": {
    id: "lost-10kg",
    name: "Major Milestone",
    description: "Lost 10 kg from starting weight",
    icon: "🏆",
  },
  "lost-20kg": {
    id: "lost-20kg",
    name: "Transformation",
    description: "Lost 20 kg from starting weight",
    icon: "🌈",
  },
  "goal-reached": {
    id: "goal-reached",
    name: "Goal Crusher",
    description: "Reached your target weight",
    icon: "🎉",
  },
  "data-veteran": {
    id: "data-veteran",
    name: "Data Veteran",
    description: "100+ weight entries",
    icon: "📊",
  },
  "year-tracker": {
    id: "year-tracker",
    name: "Year Tracker",
    description: "Tracking for over a year",
    icon: "📅",
  },
};

/**
 * Calculate current streak (consecutive days with weight entries)
 */
async function calculateStreak(): Promise<{ streak: number; lastDate: string | null }> {
  const recentWeights = await db
    .select({ date: weights.date })
    .from(weights)
    .orderBy(desc(weights.date))
    .limit(60);

  if (recentWeights.length === 0) {
    return { streak: 0, lastDate: null };
  }

  const lastDate = recentWeights[0].date;
  let streak = 1;

  for (let i = 1; i < recentWeights.length; i++) {
    const current = new Date(recentWeights[i - 1].date);
    const prev = new Date(recentWeights[i].date);
    const diffDays = Math.round((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return { streak, lastDate };
}

/**
 * Determine which badges have been earned
 */
async function calculateBadges(): Promise<Badge[]> {
  const earnedBadges: Badge[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Get all weights
  const allWeights = await db.select().from(weights).orderBy(desc(weights.date));

  if (allWeights.length === 0) return earnedBadges;

  const firstEntry = allWeights[allWeights.length - 1];
  const latestEntry = allWeights[0];
  const startWeight = firstEntry.weightKg;
  const currentWeight = latestEntry.weightKg;
  const totalLost = startWeight - currentWeight;

  // Calculate streak
  const { streak } = await calculateStreak();

  // First entry badge
  if (allWeights.length >= 1) {
    earnedBadges.push({ ...BADGES["first-entry"], earnedAt: firstEntry.createdAt });
  }

  // Streak badges
  if (streak >= 3) {
    earnedBadges.push({ ...BADGES["week-streak-3"], earnedAt: today });
  }
  if (streak >= 7) {
    earnedBadges.push({ ...BADGES["week-streak-7"], earnedAt: today });
  }
  if (streak >= 30) {
    earnedBadges.push({ ...BADGES["week-streak-30"], earnedAt: today });
  }

  // Weight loss badges
  if (totalLost >= 1) {
    earnedBadges.push({ ...BADGES["lost-1kg"], earnedAt: today });
  }
  if (totalLost >= 5) {
    earnedBadges.push({ ...BADGES["lost-5kg"], earnedAt: today });
  }
  if (totalLost >= 10) {
    earnedBadges.push({ ...BADGES["lost-10kg"], earnedAt: today });
  }
  if (totalLost >= 20) {
    earnedBadges.push({ ...BADGES["lost-20kg"], earnedAt: today });
  }

  // Data volume badges
  if (allWeights.length >= 100) {
    earnedBadges.push({ ...BADGES["data-veteran"], earnedAt: today });
  }

  // Time tracking badge
  const daysSinceStart = Math.round(
    (new Date(latestEntry.date).getTime() - new Date(firstEntry.date).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  if (daysSinceStart >= 365) {
    earnedBadges.push({ ...BADGES["year-tracker"], earnedAt: today });
  }

  return earnedBadges;
}

/**
 * Get next streak milestone
 */
function getNextStreakMilestone(currentStreak: number): number {
  const milestones = [3, 7, 14, 21, 30, 50, 100];
  for (const m of milestones) {
    if (currentStreak < m) return m;
  }
  return Math.ceil((currentStreak + 1) / 50) * 50; // After 100, every 50
}

/**
 * Calculate daily quests and their completion status
 */
async function calculateQuests(currentStreak: number): Promise<Quest[]> {
  const today = new Date().toISOString().split("T")[0];

  // Check today's weight entry
  const todayWeight = await db
    .select()
    .from(weights)
    .where(eq(weights.date, today))
    .limit(1);

  // Check today's entry (notes, energy, etc.)
  const todayEntry = await db
    .select()
    .from(entries)
    .where(eq(entries.date, today))
    .limit(1);

  // Count this week's entries
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const weekEntries = await db
    .select({ count: sql<number>`count(*)` })
    .from(weights)
    .where(gte(weights.date, weekAgoStr));

  const weekCount = weekEntries[0]?.count || 0;

  // Dynamic quests based on current streak
  const quests: Quest[] = [
    {
      id: "daily-weigh",
      name: "Daily Weigh-in",
      description: "Record your weight today",
      xpReward: 20,
      completed: todayWeight.length > 0,
    },
    {
      id: "daily-reflection",
      name: "Daily Reflection",
      description: "Add notes about your day",
      xpReward: 10,
      completed: todayEntry.length > 0 && !!todayEntry[0].notes,
    },
    {
      id: "weekly-consistency",
      name: "Weekly Consistency",
      description: `Log ${Math.max(5 - weekCount, 0)} more days this week`,
      xpReward: 50,
      completed: weekCount >= 5,
      progress: Math.min(weekCount, 5),
      target: 5,
    },
  ];

  // Add streak quest if user has a streak going
  if (currentStreak > 0) {
    const nextMilestone = getNextStreakMilestone(currentStreak);
    const daysToMilestone = nextMilestone - currentStreak;
    quests.push({
      id: "streak-milestone",
      name: `Reach ${nextMilestone}-Day Streak`,
      description: `${daysToMilestone} more day${daysToMilestone !== 1 ? "s" : ""} to go!`,
      xpReward: nextMilestone >= 30 ? 100 : nextMilestone >= 7 ? 50 : 25,
      completed: currentStreak >= nextMilestone,
      progress: currentStreak,
      target: nextMilestone,
    });
  }

  return quests;
}

/**
 * Calculate total XP and level
 */
async function calculateXpAndLevel(currentStreak: number): Promise<{ xp: number; level: number }> {
  const badges = await calculateBadges();
  const quests = await calculateQuests(currentStreak);

  // XP from badges (50 XP per badge)
  const badgeXp = badges.length * 50;

  // XP from completed quests
  const questXp = quests.filter((q) => q.completed).reduce((sum, q) => sum + q.xpReward, 0);

  // Bonus XP from total weight entries (1 XP per entry)
  const entryCount = await db.select({ count: sql<number>`count(*)` }).from(weights);
  const entryXp = entryCount[0]?.count || 0;

  const totalXp = badgeXp + questXp + entryXp;
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;

  return { xp: totalXp, level };
}

/**
 * Get complete game state
 */
export async function getGameState(): Promise<GameState> {
  // First get streak since other calculations depend on it
  const { streak, lastDate } = await calculateStreak();

  const [badges, quests, { xp, level }] = await Promise.all([
    calculateBadges(),
    calculateQuests(streak),
    calculateXpAndLevel(streak),
  ]);

  // Generate recent achievements (simplified - just show newest badges)
  const recentAchievements: Achievement[] = badges.slice(0, 3).map((b) => ({
    message: `Earned "${b.name}" badge!`,
    xp: 50,
    timestamp: b.earnedAt || new Date().toISOString(),
  }));

  return {
    xp,
    level,
    streak,
    lastWeighDate: lastDate,
    badges,
    dailyQuests: quests,
    recentAchievements,
  };
}
