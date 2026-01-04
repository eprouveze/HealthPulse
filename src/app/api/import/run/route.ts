import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const projectRoot = process.cwd();
    const scriptPath = path.join(projectRoot, "scripts/import-apple-health.ts");

    // Run the import script
    const { stdout, stderr } = await execAsync(`npx tsx "${scriptPath}"`, {
      cwd: projectRoot,
      timeout: 120000, // 2 minute timeout
    });

    // Parse import stats from stdout
    const stats = parseImportOutput(stdout);

    // Update last import timestamp
    const now = new Date().toISOString();
    await db
      .insert(settings)
      .values({ key: "last_import_timestamp", value: now, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: now, updatedAt: now },
      });

    return NextResponse.json({
      success: true,
      timestamp: now,
      stats,
      output: stdout,
      warnings: stderr || null,
    });
  } catch (error) {
    console.error("Import failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const stderr = (error as { stderr?: string }).stderr || "";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: stderr,
      },
      { status: 500 }
    );
  }
}

function parseImportOutput(output: string): Record<string, number> {
  const stats: Record<string, number> = {};

  // Match patterns like "- 123 weight days" or "- 456 workouts"
  const importedSection = output.split("Imported:")[1] || "";
  const lines = importedSection.split("\n");

  for (const line of lines) {
    const match = line.match(/^\s*-\s*(\d+)\s+(.+)$/);
    if (match) {
      const [, count, label] = match;
      stats[label.trim()] = parseInt(count, 10);
    }
  }

  return stats;
}
