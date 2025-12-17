"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy, Star, Flame, Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CelebrationType = "levelUp" | "badgeEarned" | "streakMilestone" | "goalReached";

interface CelebrationData {
  type: CelebrationType;
  title: string;
  message: string;
  icon?: string;
  value?: number | string;
}

interface CelebrationModalProps {
  celebration: CelebrationData | null;
  onClose: () => void;
}

const iconMap = {
  levelUp: Trophy,
  badgeEarned: Award,
  streakMilestone: Flame,
  goalReached: Star,
};

const colorMap = {
  levelUp: "text-xp-gold",
  badgeEarned: "text-badge-gold",
  streakMilestone: "text-streak-fire",
  goalReached: "text-success",
};

export function CelebrationModal({ celebration, onClose }: CelebrationModalProps) {
  const fireConfetti = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  useEffect(() => {
    if (celebration) {
      fireConfetti();
    }
  }, [celebration, fireConfetti]);

  if (!celebration) return null;

  const Icon = iconMap[celebration.type];
  const iconColor = colorMap[celebration.type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="bg-white rounded-2xl p-8 text-center max-w-md mx-4 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
            }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-4"
          >
            {celebration.icon ? (
              <span className="text-7xl">{celebration.icon}</span>
            ) : (
              <Icon className={`h-20 w-20 mx-auto ${iconColor}`} />
            )}
          </motion.div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold mb-2"
          >
            {celebration.title}
          </motion.h2>

          {celebration.value && (
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`text-4xl font-bold ${iconColor} mb-2`}
            >
              {celebration.value}
            </motion.p>
          )}

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-6"
          >
            {celebration.message}
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button onClick={onClose} size="lg" className="px-8">
              Continue
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper to check for new celebrations
export function checkForCelebrations(
  prevGameState: { level: number; badges: { id: string }[]; streak: number } | null,
  newGameState: { level: number; badges: { id: string; name: string; icon: string }[]; streak: number } | null,
  goalReached?: boolean
): CelebrationData | null {
  if (!newGameState) return null;

  // Check for goal reached
  if (goalReached) {
    return {
      type: "goalReached",
      title: "Goal Reached!",
      message: "Congratulations! You've reached your target weight!",
      icon: "🎉",
    };
  }

  // Check for level up
  if (prevGameState && newGameState.level > prevGameState.level) {
    return {
      type: "levelUp",
      title: "Level Up!",
      message: `You've reached Level ${newGameState.level}! Keep up the great work!`,
      value: `Level ${newGameState.level}`,
    };
  }

  // Check for new badges
  if (prevGameState) {
    const prevBadgeIds = new Set(prevGameState.badges.map(b => b.id));
    const newBadge = newGameState.badges.find(b => !prevBadgeIds.has(b.id));
    if (newBadge) {
      return {
        type: "badgeEarned",
        title: "Badge Earned!",
        message: `You've earned the "${newBadge.name}" badge!`,
        icon: newBadge.icon,
      };
    }
  }

  // Check for streak milestones
  const streakMilestones = [7, 14, 30, 60, 100];
  if (prevGameState && streakMilestones.includes(newGameState.streak) &&
      newGameState.streak > prevGameState.streak) {
    return {
      type: "streakMilestone",
      title: "Streak Milestone!",
      message: `Amazing! You've maintained a ${newGameState.streak}-day streak!`,
      value: `${newGameState.streak} Days`,
    };
  }

  return null;
}
