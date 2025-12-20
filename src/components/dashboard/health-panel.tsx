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
  Legend,
} from "recharts";
import { format, parseISO, subDays, subYears, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { Moon, Heart, Footprints } from "lucide-react";

interface SleepData {
  id: number;
  date: string;
  sleepStart: string;
  sleepEnd: string;
  durationMinutes: number;
  inBedMinutes: number | null;
}

interface RestingHRData {
  id: number;
  date: string;
  bpm: number;
}

interface WorkoutData {
  date: string;
  activityType: string;
  durationMinutes: number;
  distanceKm: number | null;
}

interface HealthPanelProps {
  sleep: SleepData[];
  restingHR: RestingHRData[];
  workouts: WorkoutData[];
  vo2max: {
    current: { date: string; vo2max: number } | null;
    prev30: { vo2max: number } | null;
  };
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
    case "30d": return subDays(now, 30);
    case "90d": return subDays(now, 90);
    case "1y": return subYears(now, 1);
    case "3y": return subYears(now, 3);
    case "5y": return subYears(now, 5);
    case "10y": return subYears(now, 10);
    case "all": return null;
  }
}

function getPeriodKey(dateStr: string, precision: Precision): string {
  const date = parseISO(dateStr);
  switch (precision) {
    case "day": return dateStr;
    case "week": return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    case "month": return format(startOfMonth(date), "yyyy-MM");
    case "year": return format(startOfYear(date), "yyyy");
  }
}

function formatPeriodLabel(key: string, precision: Precision): string {
  switch (precision) {
    case "day": return format(parseISO(key), "MMM d");
    case "week": return format(parseISO(key), "MMM d");
    case "month": return format(parseISO(key + "-01"), "MMM yyyy");
    case "year": return key;
  }
}

function getDefaultPrecision(span: TimeSpan): Precision {
  switch (span) {
    case "30d":
    case "90d": return "day";
    case "1y": return "week";
    case "3y":
    case "5y": return "month";
    case "10y":
    case "all": return "year";
  }
}

const HEALTH_PREFS_KEY = "health-chart-preferences";

interface HealthPreferences {
  timeSpan: TimeSpan;
  precision: Precision;
}

function loadPreferences(): HealthPreferences {
  if (typeof window === "undefined") {
    return { timeSpan: "90d", precision: "day" };
  }
  try {
    const saved = localStorage.getItem(HEALTH_PREFS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore
  }
  return { timeSpan: "90d", precision: "day" };
}

export function HealthPanel({ sleep, restingHR, workouts, vo2max }: HealthPanelProps) {
  const [timeSpan, setTimeSpan] = useState<TimeSpan>("90d");
  const [precision, setPrecision] = useState<Precision>("day");
  const [loaded, setLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setTimeSpan(prefs.timeSpan);
    setPrecision(prefs.precision);
    setLoaded(true);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (!loaded) return;
    const prefs: HealthPreferences = { timeSpan, precision };
    localStorage.setItem(HEALTH_PREFS_KEY, JSON.stringify(prefs));
  }, [timeSpan, precision, loaded]);

  // Filter by timespan
  const cutoff = getDateCutoff(timeSpan);
  const cutoffStr = cutoff?.toISOString().split("T")[0];

  const filteredSleep = cutoffStr ? sleep.filter(s => s.date >= cutoffStr) : sleep;
  const filteredHR = cutoffStr ? restingHR.filter(h => h.date >= cutoffStr) : restingHR;
  const filteredWorkouts = cutoffStr ? workouts.filter(w => w.date >= cutoffStr) : workouts;

  // Aggregate data by precision
  interface AggregatedData {
    periodKey: string;
    label: string;
    sleepHours: number | null;
    sleepCount: number;
    bpm: number | null;
    bpmCount: number;
  }

  const aggregatedMap = new Map<string, AggregatedData>();

  for (const s of filteredSleep) {
    const periodKey = getPeriodKey(s.date, precision);
    const existing = aggregatedMap.get(periodKey);
    const sleepHours = s.durationMinutes / 60;

    if (existing) {
      if (existing.sleepHours !== null) {
        existing.sleepHours = (existing.sleepHours * existing.sleepCount + sleepHours) / (existing.sleepCount + 1);
      } else {
        existing.sleepHours = sleepHours;
      }
      existing.sleepCount++;
    } else {
      aggregatedMap.set(periodKey, {
        periodKey,
        label: formatPeriodLabel(periodKey, precision),
        sleepHours,
        sleepCount: 1,
        bpm: null,
        bpmCount: 0,
      });
    }
  }

  for (const h of filteredHR) {
    const periodKey = getPeriodKey(h.date, precision);
    const existing = aggregatedMap.get(periodKey);

    if (existing) {
      if (existing.bpm !== null) {
        existing.bpm = (existing.bpm * existing.bpmCount + h.bpm) / (existing.bpmCount + 1);
      } else {
        existing.bpm = h.bpm;
      }
      existing.bpmCount++;
    } else {
      aggregatedMap.set(periodKey, {
        periodKey,
        label: formatPeriodLabel(periodKey, precision),
        sleepHours: null,
        sleepCount: 0,
        bpm: h.bpm,
        bpmCount: 1,
      });
    }
  }

  const chartData = Array.from(aggregatedMap.values())
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
    .map(d => ({
      ...d,
      sleepHours: d.sleepHours !== null ? Math.round(d.sleepHours * 10) / 10 : null,
      bpm: d.bpm !== null ? Math.round(d.bpm) : null,
    }));

  // Calculate averages
  const avgSleep = filteredSleep.length > 0
    ? filteredSleep.reduce((sum, s) => sum + s.durationMinutes, 0) / filteredSleep.length / 60
    : 0;
  const avgHR = filteredHR.length > 0
    ? filteredHR.reduce((sum, h) => sum + h.bpm, 0) / filteredHR.length
    : 0;
  const totalWorkoutKm = filteredWorkouts.reduce((sum, w) => sum + (w.distanceKm || 0), 0);

  return (
    <div className="space-y-6">
      {/* Time Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Health Metrics
        </h3>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Moon className="h-4 w-4" />
            <span className="text-sm font-medium">Avg Sleep</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">{avgSleep.toFixed(1)}h</p>
          <p className="text-xs text-indigo-500">{filteredSleep.length} nights</p>
          <p className="text-xs text-indigo-400 mt-1 italic">Partial data (watch worn)</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <Heart className="h-4 w-4" />
            <span className="text-sm font-medium">Avg Resting HR</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{Math.round(avgHR)} bpm</p>
          <p className="text-xs text-red-500">{filteredHR.length} days</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Footprints className="h-4 w-4" />
            <span className="text-sm font-medium">Total Distance</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{totalWorkoutKm.toFixed(0)} km</p>
          <p className="text-xs text-green-500">{filteredWorkouts.length} workouts</p>
        </div>
        {vo2max.current && (
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Heart className="h-4 w-4" />
              <span className="text-sm font-medium">VO2 Max</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{vo2max.current.vo2max.toFixed(1)}</p>
            <p className="text-xs text-purple-500">mL/kg/min</p>
            {vo2max.prev30 && (
              <p className={`text-xs mt-1 ${vo2max.current.vo2max > vo2max.prev30.vo2max ? 'text-green-600' : 'text-red-600'}`}>
                {vo2max.current.vo2max > vo2max.prev30.vo2max ? '↑' : '↓'}
                {Math.abs(vo2max.current.vo2max - vo2max.prev30.vo2max).toFixed(1)} (30d)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Combined Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h4 className="text-sm font-medium mb-4">Sleep & Heart Rate Trends</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="sleep"
                domain={[0, 12]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}h`}
                label={{ value: "Sleep", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <YAxis
                yAxisId="hr"
                orientation="right"
                domain={[40, 100]}
                tick={{ fontSize: 11 }}
                label={{ value: "BPM", angle: 90, position: "insideRight", fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="text-sm font-medium mb-2">
                          {precision === "day"
                            ? format(parseISO(data.periodKey), "EEEE, MMM d, yyyy")
                            : precision === "week"
                            ? `Week of ${format(parseISO(data.periodKey), "MMM d, yyyy")}`
                            : precision === "month"
                            ? format(parseISO(data.periodKey + "-01"), "MMMM yyyy")
                            : data.periodKey}
                        </p>
                        {data.sleepHours && (
                          <p className="text-sm text-indigo-600">
                            {precision === "day" ? "Sleep" : "Avg Sleep"}: {data.sleepHours}h
                          </p>
                        )}
                        {data.bpm && (
                          <p className="text-sm text-red-600">
                            {precision === "day" ? "Resting HR" : "Avg Resting HR"}: {data.bpm} bpm
                          </p>
                        )}
                        {precision !== "day" && (data.sleepCount > 0 || data.bpmCount > 0) && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                            {data.sleepCount > 0 && `${data.sleepCount} night${data.sleepCount !== 1 ? "s" : ""}`}
                            {data.sleepCount > 0 && data.bpmCount > 0 && " • "}
                            {data.bpmCount > 0 && `${data.bpmCount} HR reading${data.bpmCount !== 1 ? "s" : ""}`}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                yAxisId="sleep"
                dataKey="sleepHours"
                fill="rgba(99, 102, 241, 0.4)"
                name={precision === "day" ? "Sleep (hours)" : "Avg Sleep (hours)"}
                barSize={precision === "day" && timeSpan === "30d" ? 8 : 6}
              />
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="bpm"
                stroke="#ef4444"
                strokeWidth={2}
                dot={chartData.length < 60}
                name={precision === "day" ? "Resting HR (bpm)" : "Avg Resting HR (bpm)"}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {chartData.length === 0 && filteredWorkouts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No health data available for this period.</p>
          <p className="text-sm">Import Apple Health data to see sleep, heart rate, and routes.</p>
        </div>
      )}
    </div>
  );
}
