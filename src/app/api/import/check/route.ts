import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, weights } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const IMPORTS_DIR = path.join(process.cwd(), "imports");
const EXPORT_DIR_LINK = path.join(IMPORTS_DIR, "apple_health_export");

// Resolve symlink to find the real directory (e.g., Google Drive)
function getResolvedImportsDir(): string {
  try {
    if (fs.existsSync(EXPORT_DIR_LINK) && fs.lstatSync(EXPORT_DIR_LINK).isSymbolicLink()) {
      const realPath = fs.realpathSync(EXPORT_DIR_LINK);
      return path.dirname(realPath); // Parent of apple_health_export
    }
  } catch {
    // Ignore errors, use default
  }
  return IMPORTS_DIR;
}

export async function GET() {
  try {
    const resolvedImportsDir = getResolvedImportsDir();
    const resolvedExportDir = path.join(resolvedImportsDir, "apple_health_export");

    // Check for export.zip in both local and resolved (symlinked) locations
    const zipLocations = [
      path.join(IMPORTS_DIR, "export.zip"),
      path.join(resolvedImportsDir, "export.zip"),
    ];

    for (const zipPath of zipLocations) {
      if (fs.existsSync(zipPath)) {
        try {
          // Remove old export directory if it exists (in resolved location)
          if (fs.existsSync(resolvedExportDir) && !fs.lstatSync(resolvedExportDir).isSymbolicLink()) {
            fs.rmSync(resolvedExportDir, { recursive: true });
          }
          // Unzip to the resolved imports directory
          execSync(`unzip -o "${zipPath}" -d "${resolvedImportsDir}"`, { stdio: "pipe" });
          // Remove the zip after extraction
          fs.unlinkSync(zipPath);
          break;
        } catch (unzipError) {
          console.error("Failed to unzip export.zip:", unzipError);
          return NextResponse.json({
            hasNewData: false,
            reason: "unzip_failed",
            error: String(unzipError),
          });
        }
      }
    }

    // The export.xml is accessed via the symlink (which points to Google Drive)
    const exportPath = path.join(EXPORT_DIR_LINK, "export.xml");

    // Check if export file exists
    if (!fs.existsSync(exportPath)) {
      return NextResponse.json({
        hasNewData: false,
        reason: "no_export_file",
        exportPath,
      });
    }

    // Get file modification time
    const stats = fs.statSync(exportPath);
    const fileModified = stats.mtime.toISOString();

    // Get last import timestamp from settings
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "last_import_timestamp"));

    let lastImport = result[0]?.value || null;

    // If no last_import_timestamp but data exists, initialize it to file mtime
    // This prevents false positives for existing CLI imports
    if (!lastImport) {
      const [weightCount] = await db.select({ count: count() }).from(weights);
      if (weightCount.count > 0) {
        // Data exists from previous CLI imports - initialize timestamp
        lastImport = fileModified;
        await db
          .insert(settings)
          .values({ key: "last_import_timestamp", value: fileModified, updatedAt: new Date().toISOString() })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: fileModified, updatedAt: new Date().toISOString() },
          });
      }
    }

    // Determine if there's new data
    const hasNewData = !lastImport || new Date(fileModified) > new Date(lastImport);

    return NextResponse.json({
      hasNewData,
      lastImport,
      fileModified,
      exportPath,
    });
  } catch (error) {
    console.error("Error checking import status:", error);
    return NextResponse.json(
      { error: "Failed to check import status" },
      { status: 500 }
    );
  }
}
