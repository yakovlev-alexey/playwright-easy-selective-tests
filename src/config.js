import { readFile } from "fs/promises";
import { resolve } from "path";

/**
 * @typedef {Object} PestConfig
 * @property {string} [vcs='git'] - Version control system command
 * @property {string} [baseBranch='main'] - Branch name to diff against
 * @property {string[]} [forceAllTestsFiles=[]] - Additional files that force all tests to run
 * @property {string[]} [exclude=[]] - Regex patterns to exclude certain directories or files
 * @property {string} [includeOnly] - Regex pattern to include only specific files in dependency analysis
 * @property {string} endpointRegex - Regex for identifying endpoint modules in dependency cruiser output
 * @property {string} testFilesRegex - Regex for test files
 * @property {string} [testEndpointMapFile='test-endpoints.json'] - Output file for test-case to endpoint sync
 * @property {string} [tempDir='.pest-temp'] - Temporary directory for pest files
 * @property {string} [analysisFile='.pest-temp/.pest-analysis.json'] - Output file for analysis results
 * @property {string} [projectRoot] - Path (relative to VCS root) to the project/package root
 * @property {string[]} [workspacePatterns] - Glob patterns for workspace package detection
 */

/**
 * Default configuration
 * @type {PestConfig}
 */
const defaultConfig = {
  vcs: "git",
  baseBranch: "main",
  forceAllTestsFiles: [],
  exclude: [],
  testEndpointMapFile: "test-endpoints.json",
  projectRoot: undefined,
  tempDir: ".pest-temp",
  analysisFile: ".pest-temp/.pest-analysis.json",
  workspacePatterns: undefined,
};

/**
 * Files that always force all tests to run
 */
const alwaysForceAllTestsFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "npm-shrinkwrap.json",
];

/**
 * Loads configuration from file
 * @param {string} [configPath='pest.config.js'] - Path to configuration file
 * @returns {Promise<PestConfig>} Merged configuration
 */
export async function loadConfig(configPath = "pest.config.js") {
  try {
    const fullPath = resolve(process.cwd(), configPath);
    const { default: userConfig } = await import(fullPath);

    // Validate required fields
    if (!userConfig.endpointRegex) {
      throw new Error("endpointRegex is required in configuration");
    }
    if (!userConfig.testFilesRegex) {
      throw new Error("testFilesRegex is required in configuration");
    }

    return {
      ...defaultConfig,
      ...userConfig,
      forceAllTestsFiles: [
        ...alwaysForceAllTestsFiles,
        ...(userConfig.forceAllTestsFiles || []),
      ],
    };
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    throw error;
  }
}

/**
 * Creates a regex pattern from file paths for dependency cruiser
 * @param {string[]} files - Array of file paths
 * @returns {string} Regex pattern
 */
export function createFilePattern(files) {
  if (!files.length) return "";

  return files
    .map((file) => `^${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
    .join("|");
}
