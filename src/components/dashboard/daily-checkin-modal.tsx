"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, X, Coffee, Save } from "lucide-react";
import { format } from "date-fns";

interface Entry {
  date: string;
  notes: string | null;
  energyLevel: number | null;
  fastingHours: number | null;
}

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayEntry: Entry | null;
  onSave: (entry: Partial<Entry>) => Promise<void>;
}

const ENERGY_LEVELS = [
  { value: 1, emoji: "😫", label: "Very Low" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Excellent" },
];

const QUICK_FACTORS = [
  { id: "good-sleep", label: "Good Sleep", emoji: "😴" },
  { id: "poor-sleep", label: "Poor Sleep", emoji: "😪" },
  { id: "stressed", label: "Stressed", emoji: "😰" },
  { id: "relaxed", label: "Relaxed", emoji: "😌" },
  { id: "exercised", label: "Exercised", emoji: "🏃" },
  { id: "ate-well", label: "Ate Well", emoji: "🥗" },
  { id: "overate", label: "Overate", emoji: "🍔" },
  { id: "hydrated", label: "Hydrated", emoji: "💧" },
];

export function DailyCheckinModal({ isOpen, onClose, todayEntry, onSave }: DailyCheckinModalProps) {
  const [energy, setEnergy] = useState(todayEntry?.energyLevel || 3);
  const [fasting, setFasting] = useState(todayEntry?.fastingHours?.toString() || "");
  const [notes, setNotes] = useState(todayEntry?.notes || "");
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens with entry data
  useEffect(() => {
    if (isOpen) {
      setEnergy(todayEntry?.energyLevel || 3);
      setFasting(todayEntry?.fastingHours?.toString() || "");

      // Parse notes to extract factors
      const existingNotes = todayEntry?.notes || "";
      const factors: string[] = [];
      QUICK_FACTORS.forEach(f => {
        if (existingNotes.includes(`[${f.id}]`)) {
          factors.push(f.id);
        }
      });
      setSelectedFactors(factors);

      // Remove factor tags from notes for display
      let cleanNotes = existingNotes;
      QUICK_FACTORS.forEach(f => {
        cleanNotes = cleanNotes.replace(`[${f.id}]`, "").trim();
      });
      setNotes(cleanNotes);
    }
  }, [isOpen, todayEntry]);

  const toggleFactor = (factorId: string) => {
    setSelectedFactors(prev =>
      prev.includes(factorId)
        ? prev.filter(f => f !== factorId)
        : [...prev, factorId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Combine notes with factor tags
      const factorTags = selectedFactors.map(f => `[${f}]`).join(" ");
      const fullNotes = [factorTags, notes].filter(Boolean).join(" ").trim();

      await onSave({
        date: format(new Date(), "yyyy-MM-dd"),
        notes: fullNotes || null,
        energyLevel: energy,
        fastingHours: fasting ? parseFloat(fasting) : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-[5vh] -translate-x-1/2 w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Moon className="h-5 w-5" />
                  Daily Check-in
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE, MMMM d")}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Energy Level */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  How&apos;s your energy today?
                </label>
                <div className="flex gap-2">
                  {ENERGY_LEVELS.map((level) => (
                    <motion.button
                      key={level.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEnergy(level.value)}
                      className={`
                        flex-1 py-3 rounded-lg flex flex-col items-center gap-1 transition-colors
                        ${energy === level.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                        }
                      `}
                    >
                      <span className="text-2xl">{level.emoji}</span>
                      <span className="text-xs font-medium">{level.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Quick Factors */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Quick factors (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FACTORS.map((factor) => (
                    <motion.button
                      key={factor.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleFactor(factor.id)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors
                        ${selectedFactors.includes(factor.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                        }
                      `}
                    >
                      <span>{factor.emoji}</span>
                      <span>{factor.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Fasting Hours */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Coffee className="h-4 w-4" />
                  Fasting Hours (optional)
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 16 for 16:8 intermittent fasting"
                  value={fasting}
                  onChange={(e) => setFasting(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Additional notes (optional)
                </label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
                  placeholder="How are you feeling? Any observations?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex-shrink-0">
              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Check-in
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
