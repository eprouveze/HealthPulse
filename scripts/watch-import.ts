/**
 * File watcher for Apple Health export auto-import
 *
 * Watches a folder for new export.zip files and automatically imports them.
 *
 * Usage: npx tsx scripts/watch-import.ts [watch-folder]
 * Default watch folder: ~/Downloads
 *
 * When a new "export.zip" is detected, it will:
 * 1. Extract it to a temp location
 * 2. Run the import script
 * 3. Clean up the extracted files
 */

import chokidar from "chokidar";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

const watchFolder = process.argv[2] || path.join(os.homedir(), "Downloads");
const projectRoot = process.cwd();
const tempDir = path.join(os.tmpdir(), "health_import_temp");

console.log(`🔍 Watching for Apple Health exports in: ${watchFolder}`);
console.log(`📁 Project root: ${projectRoot}`);
console.log(`\nDrop an "export.zip" file to auto-import weight data.\n`);

function processExport(filePath: string) {
  console.log(`\n📦 Detected new export: ${filePath}`);

  try {
    // Clean up temp dir if exists
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
    mkdirSync(tempDir, { recursive: true });

    // Extract zip
    console.log("📂 Extracting...");
    execSync(`unzip -o "${filePath}" -d "${tempDir}"`, { stdio: "pipe" });

    // Find export.xml
    const exportXml = path.join(tempDir, "apple_health_export", "export.xml");
    if (!existsSync(exportXml)) {
      console.error("❌ Could not find export.xml in the archive");
      return;
    }

    // Run import script
    console.log("📊 Importing weight data...");
    const importScript = path.join(projectRoot, "scripts", "import-apple-health.ts");
    const result = execSync(`npx tsx "${importScript}" "${exportXml}"`, {
      cwd: projectRoot,
      encoding: "utf-8",
    });
    console.log(result);

    // Clean up
    rmSync(tempDir, { recursive: true });

    console.log("✅ Import complete!\n");
    console.log("🔄 Refresh your browser to see the new data.\n");

  } catch (error) {
    console.error("❌ Import failed:", error);
  }
}

// Watch for export.zip files
const watcher = chokidar.watch(path.join(watchFolder, "export*.zip"), {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100,
  },
});

watcher.on("add", (filePath) => {
  // Only process files that look like Apple Health exports
  const filename = path.basename(filePath).toLowerCase();
  if (filename.startsWith("export") && filename.endsWith(".zip")) {
    processExport(filePath);
  }
});

watcher.on("error", (error) => {
  console.error("Watcher error:", error);
});

console.log("Press Ctrl+C to stop watching.\n");

// Keep process running
process.on("SIGINT", () => {
  console.log("\n👋 Stopping file watcher...");
  watcher.close();
  process.exit(0);
});
