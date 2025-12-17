"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coffee, Battery, Moon, Save } from "lucide-react";
import { format } from "date-fns";

interface Entry {
  date: string;
  notes: string | null;
  energyLevel: number | null;
  fastingHours: number | null;
}

interface LifestyleTrackerProps {
  todayEntry: Entry | null;
  onSave: (entry: Partial<Entry>) => Promise<void>;
}

export function LifestyleTracker({ todayEntry, onSave }: LifestyleTrackerProps) {
  const [notes, setNotes] = useState(todayEntry?.notes || "");
  const [energy, setEnergy] = useState(todayEntry?.energyLevel || 3);
  const [fasting, setFasting] = useState(todayEntry?.fastingHours?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      date: format(new Date(), "yyyy-MM-dd"),
      notes: notes || null,
      energyLevel: energy,
      fastingHours: fasting ? parseFloat(fasting) : null,
    });
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5" />
          Daily Check-in
        </CardTitle>
        <CardDescription>{format(new Date(), "EEEE, MMMM d")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Energy Level */}
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Battery className="h-4 w-4" />
            Energy Level
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setEnergy(level)}
                className={`flex-1 py-2 rounded text-sm transition-colors ${
                  energy >= level
                    ? "bg-green-500 text-white"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {energy <= 2 ? "Low energy" : energy <= 3 ? "Normal" : "High energy!"}
          </p>
        </div>

        {/* Fasting Hours */}
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Coffee className="h-4 w-4" />
            Fasting Hours (optional)
          </label>
          <Input
            type="number"
            placeholder="e.g., 16 for 16:8"
            value={fasting}
            onChange={(e) => setFasting(e.target.value)}
            className="max-w-[150px]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium mb-2 block">Notes</label>
          <textarea
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
            placeholder="How are you feeling? Any observations?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            "Saving..."
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Check-in
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
