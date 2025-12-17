"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { format, parseISO, subDays, subYears, startOfWeek, startOfMonth, startOfYear } from "date-fns";

interface WeightData {
  date: string;
  weightKg: number;
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

interface WeightActivityChartProps {
  weights: WeightData[];
  steps: StepData[];
  workouts: WorkoutData[];
  goalWeight?: number;
}

type TimeSpan = "30d" | "90d" | "1y" | "3y" | "5y" | "10y" | "all";
type Precision = "day" | "week" | "month" | "year";

const TIME_SPANS: { value: TimeSpan; label: string }[] = [
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
  { value: "all", label: "All" },
];

const PRECISIONS: { value: Precision; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function getDateCutoff(span: TimeSpan): Date | null {
  const now = new Date();
  switch (span) {
    case "30d":
      return subDays(now, 30);
    case "90d":
      return subDays(now, 90);
    case "1y":
      return subYears(now, 1);
    case "3y":
      return subYears(now, 3);
    case "5y":
      return subYears(now, 5);
    case "10y":
      return subYears(now, 10);
    case "all":
      return null;
  }
}

function getPeriodKey(dateStr: string, precision: Precision): string {
  const date = parseISO(dateStr);
  switch (precision) {
    case "day":
      return dateStr;
    case "week":
      return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    case "month":
      return format(startOfMonth(date), "yyyy-MM");
    case "year":
      return format(startOfYear(date), "yyyy");
  }
}

function formatPeriodLabel(key: string, precision: Precision): string {
  switch (precision) {
    case "day":
      return format(parseISO(key), "MMM d");
    case "week":
      return format(parseISO(key), "MMM d");
    case "month":
      return format(parseISO(key + "-01"), "MMM yyyy");
    case "year":
      return key;
  }
}

interface AggregatedData {
  periodKey: string;
  label: string;
  weight: number;
  weightCount: number;
  steps: number;
  stepsCount: number;
  walkingKm: number;
  walkingKmCount: number;
  walkingScaled: number;
}

const CHART_PREFS_KEY = "weight-chart-preferences";

interface ChartPreferences {
  timeSpan: TimeSpan;
  precision: Precision;
  showSteps: boolean;
  showWorkouts: boolean;
}

function loadPreferences(): ChartPreferences {
  if (typeof window === "undefined") {
    return { timeSpan: "90d", precision: "day", showSteps: true, showWorkouts: true };
  }
  try {
    const saved = localStorage.getItem(CHART_PREFS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return { timeSpan: "90d", precision: "day", showSteps: true, showWorkouts: true };
}

export function WeightActivityChart({ weights, steps, workouts, goalWeight }: WeightActivityChartProps) {
  const [timeSpan, setTimeSpan] = useState<TimeSpan>("90d");
  const [precision, setPrecision] = useState<Precision>("day");
  const [showSteps, setShowSteps] = useState(true);
  const [showWorkouts, setShowWorkouts] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setTimeSpan(prefs.timeSpan);
    setPrecision(prefs.precision);
    setShowSteps(prefs.showSteps);
    setShowWorkouts(prefs.showWorkouts);
    setLoaded(true);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (!loaded) return;
    const prefs: ChartPreferences = { timeSpan, precision, showSteps, showWorkouts };
    localStorage.setItem(CHART_PREFS_KEY, JSON.stringify(prefs));
  }, [timeSpan, precision, showSteps, showWorkouts, loaded]);

  // Filter data by timespan
  const cutoff = getDateCutoff(timeSpan);
  const cutoffStr = cutoff?.toISOString().split("T")[0];

  const filteredWeights = cutoffStr
    ? weights.filter((w) => w.date >= cutoffStr)
    : weights;

  const filteredSteps = cutoffStr
    ? steps.filter((s) => s.date >= cutoffStr)
    : steps;

  const filteredWorkouts = cutoffStr
    ? workouts.filter((w) => w.date >= cutoffStr)
    : workouts;

  // Create date-indexed maps
  const stepsByDate = new Map(filteredSteps.map((s) => [s.date, s.stepCount]));
  const walkingKmByDate = new Map<string, number>();
  for (const w of filteredWorkouts) {
    if (w.activityType === "walking" && w.distanceKm) {
      walkingKmByDate.set(w.date, (walkingKmByDate.get(w.date) || 0) + w.distanceKm);
    }
  }

  // Scale walking km by 2500 to be prominent alongside steps
  const WALKING_SCALE = 2500;

  // Aggregate data by precision
  const aggregatedMap = new Map<string, AggregatedData>();

  for (const w of filteredWeights) {
    const periodKey = getPeriodKey(w.date, precision);
    const existing = aggregatedMap.get(periodKey);
    const daySteps = stepsByDate.get(w.date) || 0;
    const dayWalkingKm = walkingKmByDate.get(w.date) || 0;

    if (existing) {
      existing.weight = (existing.weight * existing.weightCount + w.weightKg) / (existing.weightCount + 1);
      existing.weightCount++;
      existing.steps += daySteps;
      existing.stepsCount += daySteps > 0 ? 1 : 0;
      existing.walkingKm += dayWalkingKm;
      existing.walkingKmCount += dayWalkingKm > 0 ? 1 : 0;
    } else {
      aggregatedMap.set(periodKey, {
        periodKey,
        label: formatPeriodLabel(periodKey, precision),
        weight: w.weightKg,
        weightCount: 1,
        steps: daySteps,
        stepsCount: daySteps > 0 ? 1 : 0,
        walkingKm: dayWalkingKm,
        walkingKmCount: dayWalkingKm > 0 ? 1 : 0,
        walkingScaled: 0, // Will be calculated after averaging
      });
    }
  }

  // For week/month/year precision, calculate averages per day
  const chartData = Array.from(aggregatedMap.values())
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
    .map((d) => {
      // For aggregated views, show average daily values
      const avgSteps = precision === "day" ? d.steps : (d.stepsCount > 0 ? Math.round(d.steps / d.stepsCount) : 0);
      const avgWalkingKm = precision === "day" ? d.walkingKm : (d.walkingKmCount > 0 ? d.walkingKm / d.walkingKmCount : 0);
      return {
        ...d,
        steps: avgSteps,
        walkingKm: precision === "day" ? d.walkingKm : avgWalkingKm,
        walkingKmTotal: d.walkingKm, // Keep total for tooltip
        walkingScaled: avgWalkingKm * WALKING_SCALE,
      };
    });

  const minWeight = Math.min(...chartData.map((d) => d.weight));
  const maxWeight = Math.max(...chartData.map((d) => d.weight));
  const padding = (maxWeight - minWeight) * 0.1 || 1;
  const maxSteps = Math.max(...chartData.map((d) => d.steps), ...chartData.map((d) => d.walkingScaled), 10000);

  // Smart default precision based on timespan
  const getDefaultPrecision = (span: TimeSpan): Precision => {
    switch (span) {
      case "30d":
      case "90d":
        return "day";
      case "1y":
        return "week";
      case "3y":
      case "5y":
        return "month";
      case "10y":
      case "all":
        return "year";
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Timespan selector */}
          <div className="flex gap-1">
            {TIME_SPANS.map((span) => (
              <button
                key={span.value}
                onClick={() => {
                  setTimeSpan(span.value);
                  setPrecision(getDefaultPrecision(span.value));
                }}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  timeSpan === span.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {span.label}
              </button>
            ))}
          </div>
          {/* Precision selector */}
          <div className="flex gap-1 border-l pl-2 ml-1">
            {PRECISIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPrecision(p.value)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  precision === p.value
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted/50 hover:bg-muted/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showSteps}
              onChange={(e) => setShowSteps(e.target.checked)}
              className="rounded"
            />
            <span className="text-blue-500">Steps</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showWorkouts}
              onChange={(e) => setShowWorkouts(e.target.checked)}
              className="rounded"
            />
            <span className="text-orange-500">Walking</span>
          </label>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            className="text-muted-foreground"
          />
          <YAxis
            yAxisId="weight"
            domain={[
              goalWeight ? Math.min(minWeight - padding, goalWeight - 2) : minWeight - padding,
              maxWeight + padding,
            ]}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(value) => `${value.toFixed(0)}`}
            label={{ value: "kg", angle: -90, position: "insideLeft", fontSize: 11 }}
          />
          {(showSteps || showWorkouts) && (
            <YAxis
              yAxisId="activity"
              orientation="right"
              domain={[0, maxSteps * 1.2]}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              label={{ value: precision === "day" ? "steps" : "avg steps", angle: 90, position: "insideRight", fontSize: 11 }}
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium mb-2">
                      {precision === "day"
                        ? format(parseISO(data.periodKey), "MMM d, yyyy")
                        : precision === "week"
                        ? `Week of ${format(parseISO(data.periodKey), "MMM d, yyyy")}`
                        : precision === "month"
                        ? format(parseISO(data.periodKey + "-01"), "MMMM yyyy")
                        : data.periodKey}
                    </p>
                    <p className="text-lg font-bold">
                      {precision === "day" ? data.weight.toFixed(1) : data.weight.toFixed(1)} kg
                      {precision !== "day" && <span className="text-xs font-normal text-muted-foreground"> avg</span>}
                    </p>
                    {showSteps && data.steps > 0 && (
                      <p className="text-sm text-blue-500">
                        {data.steps.toLocaleString()} {precision === "day" ? "steps" : "avg steps/day"}
                      </p>
                    )}
                    {showWorkouts && data.walkingKm > 0 && (
                      <p className="text-sm text-orange-500">
                        {data.walkingKm.toFixed(1)} km {precision === "day" ? "walked" : "total"}
                      </p>
                    )}
                    {precision !== "day" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.weightCount} weigh-in{data.weightCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          {goalWeight && (
            <ReferenceLine
              yAxisId="weight"
              y={goalWeight}
              stroke="hsl(var(--primary))"
              strokeDasharray="5 5"
              label={{ value: `Goal: ${goalWeight}kg`, position: "right", fontSize: 11 }}
            />
          )}
          {showSteps && (
            <Bar
              yAxisId="activity"
              dataKey="steps"
              fill="rgba(59, 130, 246, 0.3)"
              name={precision === "day" ? "Steps" : "Avg Steps"}
              barSize={precision === "day" && timeSpan === "30d" ? 8 : 6}
            />
          )}
          {showWorkouts && (
            <Bar
              yAxisId="activity"
              dataKey="walkingScaled"
              fill="rgba(249, 115, 22, 0.5)"
              name={precision === "day" ? "Walking (km)" : "Walking Total"}
              barSize={precision === "day" && timeSpan === "30d" ? 6 : 4}
            />
          )}
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={chartData.length < 100}
            activeDot={{ r: 6 }}
            name={precision === "day" ? "Weight (kg)" : "Avg Weight (kg)"}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <p className="text-muted-foreground">
            {precision === "day" ? "Data Points" : `${precision.charAt(0).toUpperCase() + precision.slice(1)}s`}
          </p>
          <p className="font-semibold">{chartData.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Weight Range</p>
          <p className="font-semibold">
            {minWeight.toFixed(1)} - {maxWeight.toFixed(1)} kg
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Change</p>
          <p className={`font-semibold ${chartData.length > 1 && chartData[chartData.length - 1].weight < chartData[0].weight ? "text-green-600" : "text-red-600"}`}>
            {chartData.length > 1
              ? `${(chartData[chartData.length - 1].weight - chartData[0].weight) > 0 ? "+" : ""}${(chartData[chartData.length - 1].weight - chartData[0].weight).toFixed(1)} kg`
              : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
