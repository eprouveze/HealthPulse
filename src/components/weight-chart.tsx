"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";

interface WeightData {
  date: string;
  weightKg: number;
}

interface WeightChartProps {
  data: WeightData[];
  goalWeight?: number;
}

export function WeightChart({ data, goalWeight }: WeightChartProps) {
  // Sort data by date ascending for chart
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      weight: d.weightKg,
      label: format(parseISO(d.date), "MMM d"),
    }));

  // Get last 90 days for default view
  const last90 = chartData.slice(-90);

  const minWeight = Math.min(...last90.map((d) => d.weight));
  const maxWeight = Math.max(...last90.map((d) => d.weight));
  const padding = (maxWeight - minWeight) * 0.1;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={last90} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
          className="text-muted-foreground"
        />
        <YAxis
          domain={[
            goalWeight ? Math.min(minWeight - padding, goalWeight - 2) : minWeight - padding,
            maxWeight + padding,
          ]}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <p className="text-sm font-medium">{format(parseISO(data.date), "MMM d, yyyy")}</p>
                  <p className="text-lg font-bold">{data.weight.toFixed(1)} kg</p>
                </div>
              );
            }
            return null;
          }}
        />
        {goalWeight && (
          <ReferenceLine
            y={goalWeight}
            stroke="hsl(var(--primary))"
            strokeDasharray="5 5"
            label={{ value: `Goal: ${goalWeight}kg`, position: "right", fontSize: 12 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
