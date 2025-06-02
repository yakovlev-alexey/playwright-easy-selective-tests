import { readdir, readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";

/**
 * Merges test endpoint mappings from worker files
 * @param {string} tempDir - Temporary directory with worker files
 * @param {string} outputFile - Output file path
 * @returns {Promise<void>}
 */
export async function mergeEndpointMappings(tempDir, outputFile) {
  try {
    // Read all worker files
    let files = [];
    try {
      files = await readdir(tempDir);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const workerFiles = files.filter(
      (f) => f.startsWith("worker-") && f.endsWith(".json")
    );

    if (workerFiles.length === 0) {
      console.log("No worker files found to merge");
      return;
    }

    // Read existing mappings
    let existingMappings = {};
    try {
      const content = await readFile(outputFile, "utf-8");
      existingMappings = JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet, start with empty mappings
    }

    // Merge all worker mappings
    const allMappings = existingMappings;

    for (const file of workerFiles) {
      const filePath = join(tempDir, file);
      try {
        const content = await readFile(filePath, "utf-8");
        const workerMappings = JSON.parse(content);

        // Merge mappings
        Object.assign(allMappings, workerMappings);

        // Clean up worker file
        await unlink(filePath);
      } catch (error) {
        console.warn(`Error processing ${file}:`, error);
      }
    }

    // Write merged mappings
    await writeFile(outputFile, JSON.stringify(allMappings, null, 2));
    console.log(`Merged ${workerFiles.length} worker files into ${outputFile}`);
  } catch (error) {
    console.error("Error merging endpoint mappings:", error);
    throw error;
  }
}
