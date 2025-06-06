#!/usr/bin/env node

import { program } from "commander";
import { writeFile, mkdir, access } from "fs/promises";
import { dirname, resolve } from "path";
import { loadConfig } from "./config.js";
import { analyzeChanges } from "./analyzer.js";
import { mergeEndpointMappings } from "./merge-endpoints.js";

program
  .name("pest")
  .description(
    "Playwright Easy Selective Tests - analyze dependencies and prepare test data"
  )
  .version("1.0.0");

program
  .command("analyze")
  .description("Analyze changes and prepare test execution data")
  .option("-c, --config <path>", "Path to configuration file", "pest.config.js")
  .action(async (options) => {
    try {
      console.log("Loading configuration...");
      const config = await loadConfig(options.config);

      console.log("Analyzing changes...");
      const analysis = await analyzeChanges(config);

      const outputData = {
        runAllTests: analysis.runAllTests,
        modifiedEndpoints: analysis.modifiedEndpoints,
        modifiedTestFiles: analysis.modifiedTestFiles,
        timestamp: new Date().toISOString(),
      };

      const outputPath = resolve(process.cwd(), config.analysisFile);
      await mkdir(dirname(outputPath), { recursive: true });

      await writeFile(outputPath, JSON.stringify(outputData, null, 2));

      console.log("\nAnalysis complete:");
      console.log(`- Run all tests: ${analysis.runAllTests}`);
      console.log(`- Affected endpoints: ${analysis.modifiedEndpoints}`);
      console.log(`- Affected test files: ${analysis.modifiedTestFiles}`);
      console.log(`\nResults saved to: ${outputPath}`);

      process.exit(0);
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("merge")
  .description("Merge test endpoint mappings from worker files")
  .option("-c, --config <path>", "Path to configuration file", "pest.config.js")
  .action(async (options) => {
    try {
      console.log("Loading configuration...");
      const config = await loadConfig(options.config);
      const tempDir = resolve(process.cwd(), config.tempDir);
      const outputFile = resolve(process.cwd(), config.testEndpointMapFile);

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
  ],
  
  // Directories and files to exclude from cruising, e.g., [.next, dist]
  exclude: ['dist'],
  
  // Include only specific files in dependency analysis (optional)
  // Example: '^(src|tests)/.*\.(ts|tsx|js|jsx)$'
  includeOnly: undefined,
  
  // Regex to identify endpoint modules in dependency output
  // REQUIRED - must be configured for your project
  endpointRegex: '^src/pages/.*\.tsx?$',

  // You can use this instead of \`endpointRegex\` to map files to endpoints, e.g.
  // getEndpointFromFile: (filePath) => {
  //   if (filePath.includes('pages/about.tsx')) return 'about'; // or any other string
  //   return null; // or undefined
  // },
  // If you don't need this, leave it undefined
  getEndpointFromFile: undefined,

  // Function to map URLs to endpoints when running tests
  // REQUIRED - must be configured for your project
  getEndpointFromUrl: (url) => {
    try {
      const u = new URL(url, "http://localhost:3000");
      let path = u.pathname;
      if (path === "/") return "pages/index.js";
      if (path.endsWith("/")) path = path.slice(0, -1);
      return \`pages\${path}.js\`;
    } catch {
      return null;
    }
  },
  
  // Regex for test files
  // REQUIRED - must be configured for your project
  testFilesRegex: '^tests/.*\.spec\.ts$',
  
  // Output file for test-endpoint mapping
  testEndpointMapFile: 'test-endpoints.json',

  // Temporary directory for worker endpoint mapping files
  tempDir: '.pest-temp',

  // Output file for analysis results
  analysisFile: '.pest-temp/.pest-analysis.json'
};
`;

    const configPath = resolve(process.cwd(), "pest.config.js");
    if (
      await access(configPath).then(
        () => true,
        () => false
      )
    ) {
      console.log("pest.config.js already exists, not overwriting");
      process.exit(0);
    }

    try {
      await writeFile(configPath, configTemplate);
      console.log("Created pest.config.js");
      console.log("\nNext steps:");
      console.log("1. Edit pest.config.js to match your project structure");
      console.log("2. Use the fixture in your Playwright tests");
      console.log(
        "3. Do a raw run to generate initial test to endpoint mapping"
      );
      console.log(
        "3. Run 'pest merge' to merge the initial test to endpoint mapping"
      );
      console.log("When making changes:");
      console.log('1. Run "pest analyze" to analyze changes');
      console.log("2. Run Playwright tests. Unaffected ones will be skipped");
      console.log(
        '3. Run "pest merge" to update the test to endpoint mapping if necessary'
      );
    } catch (error) {
      console.error("Error creating config file:", error.message);
      process.exit(1);
    }
  });

program.parse();
