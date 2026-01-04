"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle, XCircle, X } from "lucide-react";

interface ImportStatus {
  hasNewData: boolean;
  lastImport: string | null;
  fileModified: string;
  reason?: string;
}

interface ImportResult {
  success: boolean;
  timestamp?: string;
  stats?: Record<string, number>;
  error?: string;
}

type ImportState = "idle" | "checking" | "ready" | "importing" | "success" | "error";

interface ImportNotificationProps {
  onImportComplete?: () => void;
}

export function ImportNotification({ onImportComplete }: ImportNotificationProps) {
  const [state, setState] = useState<ImportState>("checking");
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkForNewData = useCallback(async () => {
    try {
      setState("checking");
      const response = await fetch("/api/import/check");
      const data: ImportStatus = await response.json();
      setImportStatus(data);
      setState(data.hasNewData ? "ready" : "idle");
    } catch (error) {
      console.error("Failed to check import status:", error);
      setState("idle");
    }
  }, []);

  useEffect(() => {
    checkForNewData();
  }, [checkForNewData]);

  const runImport = async () => {
    setState("importing");
    try {
      const response = await fetch("/api/import/run", { method: "POST" });
      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success) {
        setState("success");
        onImportComplete?.();
        // Auto-dismiss after 5 seconds on success
        setTimeout(() => setDismissed(true), 5000);
      } else {
        setState("error");
      }
    } catch (error) {
      console.error("Import failed:", error);
      setImportResult({ success: false, error: "Network error" });
      setState("error");
    }
  };

  const dismiss = () => {
    setDismissed(true);
  };

  // Don't show if dismissed, checking, or no new data
  if (dismissed || state === "checking" || state === "idle") {
    return null;
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatStats = (stats: Record<string, number>) => {
    const entries = Object.entries(stats).filter(([, count]) => count > 0);
    if (entries.length === 0) return "No new records";
    if (entries.length <= 3) {
      return entries.map(([label, count]) => `${count} ${label}`).join(", ");
    }
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return `${total} records across ${entries.length} categories`;
  };

  return (
    <Card
      className={`mb-6 border-2 transition-all ${
        state === "success"
          ? "border-green-400 bg-gradient-to-r from-green-50 to-emerald-50"
          : state === "error"
          ? "border-red-400 bg-gradient-to-r from-red-50 to-rose-50"
          : "border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50"
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {state === "importing" ? (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          ) : state === "success" ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : state === "error" ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : (
            <Download className="h-5 w-5 text-blue-600" />
          )}

          <div>
            {state === "ready" && (
              <>
                <p className="font-medium text-gray-900">
                  New health data detected
                </p>
                <p className="text-sm text-gray-600">
                  Export file modified{" "}
                  {importStatus?.fileModified && formatDate(importStatus.fileModified)}
                  {importStatus?.lastImport && (
                    <> (last import: {formatDate(importStatus.lastImport)})</>
                  )}
                </p>
              </>
            )}

            {state === "importing" && (
              <>
                <p className="font-medium text-gray-900">Importing health data...</p>
                <p className="text-sm text-gray-600">
                  This may take a minute. Please wait.
                </p>
              </>
            )}

            {state === "success" && importResult?.stats && (
              <>
                <p className="font-medium text-gray-900">Import complete!</p>
                <p className="text-sm text-gray-600">
                  {formatStats(importResult.stats)}
                </p>
              </>
            )}

            {state === "error" && (
              <>
                <p className="font-medium text-gray-900">Import failed</p>
                <p className="text-sm text-red-600">
                  {importResult?.error || "An unexpected error occurred"}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state === "ready" && (
            <Button size="sm" onClick={runImport}>
              <Download className="h-4 w-4 mr-1" />
              Import Now
            </Button>
          )}

          {state === "error" && (
            <Button size="sm" variant="outline" onClick={runImport}>
              Retry
            </Button>
          )}

          {(state === "ready" || state === "error" || state === "success") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
