"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Utensils, Flame, Sparkles, X, Loader2, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface NutritionSprint {
  id: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  isActive: boolean;
  currentDay?: number;
}

interface FoodEntry {
  id: number;
  sprintId: number;
  date: string;
  time: string;
  item: string;
  calories: number;
  proteinG: number | null;
  aiEstimated: boolean;
}

interface CalorieEstimate {
  calories: number;
  proteinG: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

interface NutritionSprintProps {
  apiKey: string | null;
}

export function NutritionSprintPanel({ apiKey }: NutritionSprintProps) {
  const [activeSprint, setActiveSprint] = useState<NutritionSprint | null>(null);
  const [todaysEntries, setTodaysEntries] = useState<FoodEntry[]>([]);
  const [foodItem, setFoodItem] = useState("");
  const [calories, setCalories] = useState<string>("");
  const [proteinG, setProteinG] = useState<string>("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimate, setEstimate] = useState<CalorieEstimate | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const fetchSprintData = useCallback(async () => {
    try {
      const res = await fetch("/api/nutrition-sprints");
      const data = await res.json();
      setActiveSprint(data.activeSprint);

      if (data.activeSprint) {
        const entriesRes = await fetch(`/api/food-entries?sprintId=${data.activeSprint.id}&date=${today}`);
        const entriesData = await entriesRes.json();
        setTodaysEntries(entriesData.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch sprint data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchSprintData();
  }, [fetchSprintData]);

  const startSprint = async (days: number) => {
    try {
      const res = await fetch("/api/nutrition-sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays: days }),
      });
      const data = await res.json();
      setActiveSprint(data);
      setTodaysEntries([]);
    } catch (error) {
      console.error("Failed to start sprint:", error);
    }
  };

  const endSprint = async () => {
    if (!activeSprint) return;
    try {
      await fetch(`/api/nutrition-sprints?id=${activeSprint.id}`, {
        method: "DELETE",
      });
      setActiveSprint(null);
      setTodaysEntries([]);
    } catch (error) {
      console.error("Failed to end sprint:", error);
    }
  };

  const estimateCalories = async () => {
    if (!foodItem.trim()) return;
    setIsEstimating(true);
    setEstimate(null);

    try {
      const res = await fetch("/api/estimate-calories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodItem, apiKey }),
      });
      const data = await res.json();

      if (data.error) {
        console.error("Estimation error:", data.error);
        return;
      }

      setEstimate(data);
      setCalories(data.calories.toString());
      setProteinG(data.proteinG.toString());
    } catch (error) {
      console.error("Failed to estimate calories:", error);
    } finally {
      setIsEstimating(false);
    }
  };

  const addFoodEntry = async () => {
    if (!activeSprint || !foodItem.trim() || !calories) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      const res = await fetch("/api/food-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sprintId: activeSprint.id,
          date: today,
          time,
          item: foodItem,
          calories: parseFloat(calories),
          proteinG: proteinG ? parseFloat(proteinG) : null,
          aiEstimated: estimate !== null,
        }),
      });

      const data = await res.json();
      if (data.entry) {
        setTodaysEntries((prev) => [data.entry, ...prev]);
        setFoodItem("");
        setCalories("");
        setProteinG("");
        setEstimate(null);
      }
    } catch (error) {
      console.error("Failed to add food entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      await fetch(`/api/food-entries?id=${id}`, { method: "DELETE" });
      setTodaysEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const totalCaloriesToday = todaysEntries.reduce((sum, e) => sum + e.calories, 0);
  const totalProteinToday = todaysEntries.reduce((sum, e) => sum + (e.proteinG || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Nutrition Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // No active sprint - show start options
  if (!activeSprint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Nutrition Sprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Track your food intake for a focused period. AI-powered calorie estimation helps when you don&apos;t know exact values.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => startSprint(10)} variant="outline" size="sm">
              10 Days
            </Button>
            <Button onClick={() => startSprint(14)} variant="outline" size="sm">
              14 Days
            </Button>
            <Button onClick={() => startSprint(20)} variant="outline" size="sm">
              20 Days
            </Button>
          </div>
          {!apiKey && (
            <p className="text-xs text-amber-600">
              Set your API key in Settings to enable AI calorie estimation.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Active sprint - show food entry form
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Day {activeSprint.currentDay} of {activeSprint.durationDays}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={endSprint} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4 mr-1" />
            End
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(activeSprint.startDate), "MMM d")} - {format(new Date(activeSprint.endDate), "MMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Totals */}
        <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="font-semibold">{Math.round(totalCaloriesToday)}</span>
            <span className="text-sm text-muted-foreground">kcal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{Math.round(totalProteinToday)}g</span>
            <span className="text-sm text-muted-foreground">protein</span>
          </div>
        </div>

        {/* Food Entry Form */}
        <div className="space-y-2">
          <Input
            placeholder="Enter food (e.g., '100g grilled chicken')"
            value={foodItem}
            onChange={(e) => setFoodItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apiKey && estimateCalories()}
          />

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Calories"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-24"
            />
            <Input
              type="number"
              placeholder="Protein (g)"
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              className="w-24"
            />
            {apiKey && (
              <Button
                onClick={estimateCalories}
                disabled={!foodItem.trim() || isEstimating}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                {isEstimating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={addFoodEntry}
              disabled={!foodItem.trim() || !calories || isSubmitting}
              size="sm"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>

          {/* AI Estimate Info */}
          {estimate && (
            <div className="text-xs p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
              <span className={`font-medium ${
                estimate.confidence === "high" ? "text-green-600" :
                estimate.confidence === "medium" ? "text-amber-600" : "text-red-600"
              }`}>
                {estimate.confidence} confidence
              </span>
              : {estimate.reasoning}
            </div>
          )}
        </div>

        {/* Today's Entries */}
        {todaysEntries.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Today&apos;s entries ({todaysEntries.length})
            </button>

            {showHistory && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {todaysEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 text-sm bg-muted/30 rounded group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">{entry.time}</span>
                      <span className="truncate">{entry.item}</span>
                      {entry.aiEstimated && (
                        <Sparkles className="h-3 w-3 text-blue-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{Math.round(entry.calories)}</span>
                      <span className="text-muted-foreground text-xs">kcal</span>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
