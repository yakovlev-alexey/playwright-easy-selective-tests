#!/usr/bin/env node

import { program } from "commander";
import { writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { loadConfig } from "./config.js";
import { analyzeChanges } from "./analyzer.js";
import { mergeEndpointMappings } from "./merge-endpoints.js";

const DEFAULT_TEMP_DIR = ".pest-temp";
const DEFAULT_ANALYSIS_FILE = `${DEFAULT_TEMP_DIR}/.pest-analysis.json`;

program
  .name("pest")
  .description(
    "Playwright Easy Selective Tests - analyze dependencies and prepare test data"
  )
  .version("0.1.0");

program
  .command("analyze")
  .description("Analyze changes and prepare test execution data")
  .option("-c, --config <path>", "Path to configuration file", "pest.config.js")
  .option(
    "-o, --output <path>",
    "Output file for analysis results",
    DEFAULT_ANALYSIS_FILE
  )
  .action(async (options) => {
    try {
      console.log("Loading configuration...");
      const config = await loadConfig(options.config);

      console.log("Analyzing changes...");
      const analysis = await analyzeChanges(config);

      // Prepare output data
      const outputData = {
        runAllTests: analysis.runAllTests,
        modifiedEndpoints: analysis.modifiedEndpoints,
        modifiedTestFiles: analysis.modifiedTestFiles,
        timestamp: new Date().toISOString(),
      };

      // Create output directory if needed
      const outputPath = resolve(process.cwd(), options.output);
      await mkdir(dirname(outputPath), { recursive: true });

      // Write analysis results
      await writeFile(outputPath, JSON.stringify(outputData, null, 2));

      console.log("\nAnalysis complete:");
      console.log(`- Run all tests: ${analysis.runAllTests}`);
      console.log(`- Modified endpoints: ${analysis.modifiedEndpoints.length}`);
      console.log(
        `- Modified test files: ${analysis.modifiedTestFiles.length}`
      );
      console.log(`\nResults saved to: ${outputPath}`);

      // Exit with code 0 (success)
      process.exit(0);
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("merge")
  .description("Merge test endpoint mappings from worker files")
  .option(
    "-d, --temp-dir <path>",
    "Temporary directory with worker files",
    ".pest-temp"
  )
  .option(
    "-o, --output <path>",
    "Output file for merged mappings",
    "test-endpoints.json"
  )
  .action(async (options) => {
    try {
      const tempDir = resolve(process.cwd(), options.tempDir);
      const outputFile = resolve(process.cwd(), options.output);

      console.log("Merging endpoint mappings...");
      await mergeEndpointMappings(tempDir, outputFile);

      console.log("Done!");
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Initialize pest configuration file")
  .action(async () => {
    const configTemplate = `/**
 * @type {import('playwright-easy-selective-tests').PestConfig}
 */
export default {
  // Version control system command (default: 'git')
  vcs: 'git',
  
  // Branch to diff against (default: 'main')
  baseBranch: 'main',
  
  // Additional files that force all tests to run
  // (package.json and lock files are always included)
  forceAllTestsFiles: [
    'playwright.config.js',
    'playwright.config.ts',
    '.github/workflows/*.yml'
  ],
  
  // Directories to exclude from dependency analysis
  excludeDirectories: [
    'node_modules',
    'dist',
    'build',
    '.git'
  ],
  
  // Include only specific files in dependency analysis (optional)
  // Example: '^(src|tests)/.*\\.(ts|tsx|js|jsx)$'
  includeOnly: undefined,
  
  // Regex to identify endpoint modules in dependency output
  // REQUIRED - must be configured for your project
  endpointRegex: '^src/pages/.*\\.tsx?$',
  
  // Regex for test files
  // REQUIRED - must be configured for your project
  testFilesRegex: '^tests/.*\\.spec\\.ts$',
  
  // Output file for test-endpoint mapping
  testEndpointMapFile: 'test-endpoints.json'
};
`;

    const configPath = resolve(process.cwd(), "pest.config.js");

    try {
      await writeFile(configPath, configTemplate);
      console.log("Created pest.config.js");
      console.log("\nNext steps:");
      console.log("1. Edit pest.config.js to match your project structure");
      console.log('2. Run "pest analyze" to analyze changes');
      console.log("3. Use the fixture in your Playwright tests");
    } catch (error) {
      console.error("Error creating config file:", error.message);
      process.exit(1);
    }
  });

program.parse();
