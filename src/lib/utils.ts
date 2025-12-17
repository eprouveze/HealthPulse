import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calculateWeightChange(current: number, previous: number): {
  change: number;
  percentage: number;
  direction: "up" | "down" | "same";
} {
  const change = current - previous;
  const percentage = (change / previous) * 100;
  const direction = change > 0.1 ? "up" : change < -0.1 ? "down" : "same";
  return { change, percentage, direction };
}
