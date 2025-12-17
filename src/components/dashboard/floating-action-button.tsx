"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, X, Plus, Minus } from "lucide-react";
import { format } from "date-fns";

interface FloatingActionButtonProps {
  currentWeight?: number;
  onSubmit: (weight: number, date: string, notes?: string) => Promise<void>;
}

export function FloatingActionButton({ currentWeight, onSubmit }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState(currentWeight?.toFixed(1) || "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = () => {
    setWeight(currentWeight?.toFixed(1) || "");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!weight) return;
    setSubmitting(true);
    try {
      await onSubmit(parseFloat(weight), date, notes || undefined);
      setIsOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || currentWeight || 70;
    setWeight((current + delta).toFixed(1));
  };

  return (
    <>
      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-shadow"
      >
        <Scale className="h-6 w-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Log Weight
                </h2>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Weight Input with +/- buttons */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Weight (kg)</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustWeight(-0.1)}
                    className="h-12 w-12"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="text-center text-2xl font-mono h-12 flex-1"
                    placeholder="0.0"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustWeight(0.1)}
                    className="h-12 w-12"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Date Input */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              {/* Notes Input */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
                  placeholder="Any context? (e.g., after meal, morning, etc.)"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!weight || submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? "Saving..." : "Save Weight"}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
