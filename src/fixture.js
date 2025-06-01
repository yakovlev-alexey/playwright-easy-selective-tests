import { test } from "@playwright/test";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import {
  readJsonFile,
  getTestId,
  isTestFileModified,
  getTempFilePath,
} from "./fixture-utils.js";

/**
 * @typedef {Object} TestEndpointsMap
 * @property {Object.<string, string[]>} [key] - Map of test IDs to endpoint arrays
 */

/**
 * @typedef {Object} FixtureOptions
 * @property {string} [analysisFile='.pest-analysis.json'] - Path to analysis results file
 * @property {string} [endpointMapFile='test-endpoints.json'] - Path to test-endpoint map file
 * @property {string} [tempDir='.pest-temp'] - Temporary directory for worker files
 * @property {(url: string) => string|null} [getEndpointFromUrl] - Function to extract endpoint from URL
 */

/**
 * Creates a Playwright fixture for selective test execution
 * @param {FixtureOptions} options - Fixture options
 * @returns {Function} Playwright fixture function
 */
export function createSelectiveTestFixture(options = {}) {
  const {
    analysisFile = ".pest-analysis.json",
    testEndpointMapFile = "tests/test-endpoints.json",
    tempDir = ".pest-temp",
    getEndpointFromUrl = () => null,
  } = options;

  // Create temp directory on module load
  (async () => {
    try {
      await mkdir(join(process.cwd(), tempDir), { recursive: true });
    } catch (err) {
      console.warn(`Failed to create temp directory: ${err}`);
    }
  })();

  // Load analysis data and endpoint map once
  let analysisData = null;
  let endpointMap = {};
  let workerEndpointMap = {};

  const fixture = async ({ page }, use, testInfo) => {
    if (!analysisData) {
      analysisData = await readJsonFile(join(process.cwd(), analysisFile));
      endpointMap = await readJsonFile(
        join(process.cwd(), testEndpointMapFile)
      );
    }

    const testId = getTestId(testInfo);
    const expectedEndpoints = endpointMap[testId] || [];
    const trackedEndpoints = new Set();

    // Check if test should run
    const shouldRunAllTests = analysisData.runAllTests || false;
    const modifiedEndpoints = analysisData.modifiedEndpoints || [];
    const modifiedTestFiles = analysisData.modifiedTestFiles || [];
    const isCurrentTestModified = isTestFileModified(
      testInfo.file,
      modifiedTestFiles
    );

    let shouldRun = true;

    if (
      !shouldRunAllTests &&
      !isCurrentTestModified &&
      expectedEndpoints.length > 0
    ) {
      shouldRun = expectedEndpoints.some((endpoint) =>
        modifiedEndpoints.some(
          (modified) =>
            modified.includes(endpoint) || endpoint.includes(modified)
        )
      );

      test.skip(
        !shouldRun,
        `Test skipped: no modified endpoints (expected: ${expectedEndpoints.join(
          ", "
        )}, modified: ${modifiedEndpoints.join(", ")})`
      );
    }

    // Track endpoint usage
    const trackEndpoint = (url) => {
      const endpoint = getEndpointFromUrl(url);
      if (endpoint) {
        trackedEndpoints.add(endpoint);
      }
    };

    // Listen for navigation events
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        trackEndpoint(frame.url());
      }
    });

    // Use the page
    await use();

    if (!shouldRun) {
      return;
    }

    const trackedList = Array.from(trackedEndpoints);
    const unexpectedEndpoints = trackedList.filter(
      (ep) => !expectedEndpoints.includes(ep)
    );
    const missingEndpoints = expectedEndpoints.filter(
      (ep) => !trackedEndpoints.has(ep)
    );

    if (unexpectedEndpoints.length > 0 || missingEndpoints.length > 0) {
      let message = "";
      if (unexpectedEndpoints.length > 0) {
        message += `Unexpected endpoints used: ${unexpectedEndpoints.join(
          ", "
        )}. `;
      }
      if (missingEndpoints.length > 0) {
        message += `Expected endpoints not used: ${missingEndpoints.join(
          ", "
        )}. `;
      }
      message += `Update ${testEndpointMapFile} and run tests again.`;

      testInfo.status = "failed";
      testInfo.annotations.push({
        type: "endpoint-mismatch",
        description: message,
      });

      // Store mismatch for later
      workerEndpointMap[testId] = trackedList;
    }
  };

  const afterAllHook = async ({}, testInfo) => {
    if (Object.keys(workerEndpointMap).length === 0) {
      return;
    }

    const workerId = `${testInfo.workerIndex}`;
    const tempFilePath = getTempFilePath(
      workerId,
      join(process.cwd(), tempDir)
    );

    try {
      await writeFile(tempFilePath, JSON.stringify(workerEndpointMap, null, 2));
      console.log(
        `Worker ${workerId} saved endpoint data for ${
          Object.keys(workerEndpointMap).length
        } tests. Make sure to run 'pest merge' to update the endpoint map.`
      );
    } catch (error) {
      console.warn(`Error writing worker file ${workerId}: ${error}`);
    }
  };

  return [[fixture, { scope: "test", auto: true }], afterAllHook];
}
