import { cruise } from "dependency-cruiser";
import { createFilePattern } from "./config.js";
import {
  filterAndNormalizeChangedFiles,
  getChangedFilesMatching,
  wereFilesModified,
} from "./vcs.js";
import { findPackages } from "@pnpm/fs.find-packages";
import { resolve, sep } from "path";
import { readFile } from "fs/promises";

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
  const endpoints = new Set();
  const tests = new Set();

  allAffectedFiles.forEach((file) => {
    if (testRegex.test(file)) {
      tests.add(file);
    } else if (config.getEndpointFromFile) {
      const endpoint = config.getEndpointFromFile(file);
      if (endpoint) {
        endpoints.add(endpoint);
      }
    } else if (endpointRegex.test(file)) {
      endpoints.add(file);
    }
  });

  changedFiles.forEach((file) => {
    if (testRegex.test(file)) {
      tests.add(file);
    } else if (config.getEndpointFromFile) {
      const endpoint = config.getEndpointFromFile(file);
      if (endpoint) {
        endpoints.add(endpoint);
      }
    } else if (endpointRegex.test(file)) {
      endpoints.add(file);
    }
  });

  return {
    endpoints: [...endpoints],
    tests: [...tests],
  };
}

/**
 * Checks if any workspace dependency packages have changed
 * @param {import('./config.js').PestConfig} config
 * @returns {Promise<boolean>} True if any dependency package changed
 */
async function checkWorkspaceDependenciesChanged(config) {
  if (config.workspacePatterns && config.projectRoot) {
    const cwd = process.cwd();
    const workspaceRoot = cwd.endsWith(config.projectRoot)
      ? cwd.slice(0, -config.projectRoot.length).replace(/\/$/, "")
      : cwd;
    const pkgs = await findPackages(workspaceRoot, {
      ignore: ["**/node_modules/**", "**/bower_components/**"],
      includeRoot: true,
      patterns: config.workspacePatterns,
    });

    const projectPkgPath = resolve(cwd, "package.json");
    const projectPkg = JSON.parse(await readFile(projectPkgPath, "utf8"));

    const directDeps = new Set([
      ...Object.keys(projectPkg.dependencies || {}),
      ...Object.keys(projectPkg.devDependencies || {}),
    ]);

    const dependencyPackages = pkgs.filter((pkg) => {
      const pkgName = pkg.manifest.name;
      return directDeps.has(pkgName);
    });

    const pkgsToCheck = dependencyPackages
      .map((pkg) => pkg.rootDir.replace(workspaceRoot + sep, ""))
      .filter((pkg) => pkg !== "");

    return wereFilesModified(config.vcs, config.baseBranch, pkgsToCheck);
  }
  return false;
}

/**
 * Performs full analysis to determine which tests should run
 * @param {import('./config.js').PestConfig} config - Configuration
 * @returns {Promise<AnalysisResult>} Analysis result
 */
export async function analyzeChanges(config) {
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

  const depsChanged = await checkWorkspaceDependenciesChanged(config);
  if (depsChanged) {
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
