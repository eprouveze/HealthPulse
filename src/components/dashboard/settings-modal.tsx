"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X, Key, Target, Download, Upload } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  currentGoal: number | null;
  onSaveGoal: (weight: number) => Promise<void>;
}

export function SettingsModal({
  isOpen,
  onClose,
  apiKey: initialApiKey,
  onSaveApiKey,
  currentGoal,
  onSaveGoal,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [goalWeight, setGoalWeight] = useState(currentGoal?.toString() || "");
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    setApiKey(initialApiKey);
  }, [initialApiKey]);

  useEffect(() => {
    setGoalWeight(currentGoal?.toString() || "");
  }, [currentGoal]);

  const handleSaveApiKey = () => {
    onSaveApiKey(apiKey);
  };

  const handleSaveGoal = async () => {
    if (!goalWeight) return;
    setSavingGoal(true);
    try {
      await onSaveGoal(parseFloat(goalWeight));
    } finally {
      setSavingGoal(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/export");
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weight-tracker-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Goal Weight */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4" />
                  Goal Weight
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                    placeholder={
                      currentGoal
                        ? `Current: ${currentGoal} kg`
                        : "Target weight in kg"
                    }
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveGoal}
                    disabled={savingGoal || !goalWeight}
                  >
                    {savingGoal ? "Saving..." : "Set"}
                  </Button>
                </div>
                {currentGoal && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current target: {currentGoal} kg
                  </p>
                )}
              </div>

              {/* API Key */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4" />
                  Anthropic API Key (for AI Coach)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="flex-1"
                  />
                  <Button onClick={handleSaveApiKey} variant="outline">
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Get your API key from{" "}
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              {/* Data Management */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Download className="h-4 w-4" />
                  Data Management
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data (JSON)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Data syncs automatically from Apple Health via the import
                  script.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-muted/30 rounded-b-2xl">
              <p className="text-xs text-muted-foreground text-center">
                WeightTracker • Data from Apple Health
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
