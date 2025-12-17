"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { format, subDays, isSameDay, parseISO } from "date-fns";

interface StreakCalendarProps {
  currentStreak: number;
  weighDates: string[]; // Array of ISO date strings when user logged weight
}

export function StreakCalendar({ currentStreak, weighDates }: StreakCalendarProps) {
  const today = new Date();

  // Generate last 35 days (5 weeks)
  const days = useMemo(() => {
    const result = [];
    const weighDateSet = new Set(weighDates.map(d => format(parseISO(d), "yyyy-MM-dd")));

    // Start from 34 days ago to show 5 complete weeks
    for (let i = 34; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const isToday = isSameDay(date, today);
      const logged = weighDateSet.has(dateStr);

      result.push({
        date,
        dateStr,
        isToday,
        logged,
        dayOfWeek: date.getDay(),
      });
    }
    return result;
  }, [weighDates, today]);

  // Calculate longest streak from data
  const longestStreak = useMemo(() => {
    if (weighDates.length === 0) return 0;

    const sortedDates = [...weighDates]
      .map(d => parseISO(d))
      .sort((a, b) => a.getTime() - b.getTime());

    let maxStreak = 1;
    let currentStreakCount = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.round((sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreakCount++;
        maxStreak = Math.max(maxStreak, currentStreakCount);
      } else if (diff > 1) {
        currentStreakCount = 1;
      }
    }

    return maxStreak;
  }, [weighDates]);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Flame className={`h-5 w-5 ${currentStreak >= 3 ? "text-streak-fire" : "text-muted-foreground"}`} />
            Streak
          </span>
          <div className="flex gap-4 text-sm font-normal">
            <span>
              Current: <strong className="text-streak-fire">{currentStreak}</strong>
            </span>
            <span className="text-muted-foreground">
              Best: <strong>{longestStreak}</strong>
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Add empty cells for alignment to start on correct day */}
          {Array.from({ length: days[0].dayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => (
            <div
              key={day.dateStr}
              className={`
                aspect-square rounded-md flex items-center justify-center text-xs
                transition-all duration-200
                ${day.isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                ${day.logged
                  ? "bg-success text-white font-medium"
                  : "bg-muted/50 text-muted-foreground"
                }
              `}
              title={`${format(day.date, "MMM d, yyyy")}${day.logged ? " - Logged" : ""}`}
            >
              {format(day.date, "d")}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-success" />
            <span>Logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted/50" />
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded ring-2 ring-primary ring-offset-1" />
            <span>Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
