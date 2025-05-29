import { readFile } from "fs/promises";
import { join, basename } from "path";

/**
 * Reads and parses a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Object} Parsed JSON object or empty object if file doesn't exist
 */
export async function readJsonFile(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

/**
 * Generates a unique test ID from test info
 * @param {import('@playwright/test').TestInfo} testInfo - Playwright test info
 * @returns {string} Unique test ID
 */
export function getTestId(testInfo) {
  const fileName = basename(testInfo.file);
  const testPath = testInfo.titlePath.slice(1).join(" ");
  return `${fileName}::${testPath}`;
}

/**
 * Gets the endpoint name from a URL
 * @param {string} url - URL to extract endpoint from
 * @param {string} endpointRegex - Regex pattern for endpoints
 * @returns {string|null} Endpoint name or null
 */
export function getEndpointByUrl(url, endpointRegex) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Extract endpoint from pathname
    const regex = new RegExp(endpointRegex);
    const match = pathname.match(regex);

    if (match) {
      return match[0];
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if a test file was modified
 * @param {string} testFile - Test file path
 * @param {string[]} modifiedFiles - List of modified files
 * @returns {boolean} True if test file was modified
 */
export function isTestFileModified(testFile, modifiedFiles) {
  return modifiedFiles.some(
    (file) => testFile.includes(file) || file.includes(testFile)
  );
}

/**
 * Gets path for temporary worker file
 * @param {string} workerId - Worker ID
 * @param {string} tempDir - Temporary directory
 * @returns {string} Path to temporary file
 */
export function getTempFilePath(workerId, tempDir) {
  return join(tempDir, `worker-${workerId}.json`);
}
