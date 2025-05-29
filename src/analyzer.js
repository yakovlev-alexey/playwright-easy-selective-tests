import { cruise } from "dependency-cruiser";
import { createFilePattern } from "./config.js";
import { getChangedFilesMatching, wereFilesModified } from "./vcs.js";

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
 * @param {string[]} excludeDirs - Directories to exclude
 * @returns {Promise<string[]>} List of all referenced files
 */
async function getAllAffectedFiles(filePattern, includeOnly, excludeDirs) {
  if (!filePattern) return [];
  const cruiseOptions = {
    outputType: "dot",
    includeOnly: includeOnly || undefined,
    exclude: excludeDirs.length > 0 ? excludeDirs.join("|") : undefined,
  };
  const filesToCruise = ["."];
  try {
    const result = await cruise(filesToCruise, cruiseOptions);
    const dotOutput = result.output;
    const files = new Set();
    const fileRegex = /"([^"\s]+)"/g;
    let match;
    while ((match = fileRegex.exec(dotOutput)) !== null) {
      const file = match[1];
      if (!file.includes("->")) {
        files.add(file);
      }
    }
    return Array.from(files);
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
  // Get all changed files
  const changedFiles = await getChangedFilesMatching(
    config.vcs,
    config.baseBranch,
    /.*/
  );
  const filePattern = createFilePattern(changedFiles);
  const allAffectedFiles = await getAllAffectedFiles(
    filePattern,
    config.includeOnly,
    config.excludeDirectories
  );
  const { endpoints: modifiedEndpoints, tests: modifiedTestFiles } =
    filterAffectedFiles(allAffectedFiles, changedFiles, config);
  return {
    runAllTests: false,
    modifiedEndpoints,
    modifiedTestFiles,
  };
}
