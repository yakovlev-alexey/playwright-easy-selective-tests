import { cruise } from "dependency-cruiser";
import { createFilePattern } from "./config.js";
import {
  filterAndNormalizeChangedFiles,
  getChangedFilesMatching,
  wereFilesModified,
} from "./vcs.js";

/**
 * @typedef {Object} AnalysisResult
 * @property {boolean} runAllTests - Whether to run all tests
 * @property {string[]} modifiedEndpoints - Modified endpoints
 * @property {string[]} modifiedTestFiles - Modified test files
 */

/**
 * Runs dependency-cruiser API once and returns all referenced files
 * @param {string} filePattern - Pattern of changed files (regex string)
 * @param {string} [includeOnly] - Regex pattern to include only specific files
 * @param {string[]} exclude - Directories to exclude
 * @returns {Promise<string[]>} List of all referenced files
 */
async function getAllAffectedFiles(filePattern, includeOnly, exclude) {
  if (!filePattern) return [];

  const cruiseOptions = {
    exclude: [...(exclude || []), "node_modules", "dist", "build", ".git"],
    outputType: "text",
    reaches: filePattern,
  };

  if (includeOnly) {
    cruiseOptions.includeOnly = includeOnly;
  }

  const filesToCruise = ["."];

  try {
    const { output } = await cruise(filesToCruise, cruiseOptions);
    const files = new Set();

    for (const line of output.split("\n")) {
      if (!line.trim()) continue;
      // Support both unicode and ascii arrows
      const [left, right] = line.split(/\s*(?:→|->)\s*/);
      if (left) files.add(left.trim());
      if (right) files.add(right.trim());
    }

    return Array.from(files).filter(Boolean);
  } catch (error) {
    console.error("Error running dependency-cruiser:", error.message);
    return [];
  }
}

/**
 * Finds affected endpoints and test files from the set of all referenced files
 * @param {string[]} allAffectedFiles - All referenced files from dependency-cruiser
 * @param {string[]} changedFiles - List of changed files
 * @param {import('./config.js').PestConfig} config - Configuration
 * @returns {{endpoints: string[], tests: string[]}}
 */
function filterAffectedFiles(allAffectedFiles, changedFiles, config) {
  const endpointRegex = new RegExp(config.endpointRegex);
  const testRegex = new RegExp(config.testFilesRegex);
  const endpoints = allAffectedFiles.filter((file) => endpointRegex.test(file));
  const tests = allAffectedFiles.filter((file) => testRegex.test(file));

  // Also check if changed files themselves are endpoints or tests
  changedFiles.forEach((file) => {
    if (endpointRegex.test(file) && !endpoints.includes(file)) {
      endpoints.push(file);
    }
    if (testRegex.test(file) && !tests.includes(file)) {
      tests.push(file);
    }
  });

  return {
    endpoints: [...new Set(endpoints)],
    tests: [...new Set(tests)],
  };
}

/**
 * Performs full analysis to determine which tests should run
 * @param {import('./config.js').PestConfig} config - Configuration
 * @returns {Promise<AnalysisResult>} Analysis result
 */
export async function analyzeChanges(config) {
  // Check if any force-all-tests files were modified
  const forceAll = await wereFilesModified(
    config.vcs,
    config.baseBranch,
    config.forceAllTestsFiles
  );

  if (forceAll) {
    return {
      runAllTests: true,
      modifiedEndpoints: [],
      modifiedTestFiles: [],
    };
  }

  const changedFilesRaw = await getChangedFilesMatching(
    config.vcs,
    config.baseBranch,
    /.*/
  );

  const changedFiles = filterAndNormalizeChangedFiles(
    changedFilesRaw,
    config.projectRoot
  );

  const filePattern = createFilePattern(changedFiles);

  const allAffectedFiles = await getAllAffectedFiles(
    filePattern,
    config.includeOnly,
    config.exclude
  );

  const { endpoints: modifiedEndpoints, tests: modifiedTestFiles } =
    filterAffectedFiles(allAffectedFiles, changedFiles, config);

  return {
    runAllTests: false,
    modifiedEndpoints,
    modifiedTestFiles,
  };
}
