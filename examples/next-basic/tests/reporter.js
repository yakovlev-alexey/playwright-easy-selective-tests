import fs from "fs/promises";

/**
 * @typedef {import('@playwright/test').FullConfig} FullConfig
 * @typedef {import('@playwright/test').FullResult} FullResult
 * @typedef {import('@playwright/test').Reporter} Reporter
 * @typedef {import('@playwright/test').Suite} Suite
 * @typedef {import('@playwright/test').TestCase} TestCase
 * @typedef {import('@playwright/test').TestResult} TestResult
 */

/**
 * @implements {Reporter}
 */
class JsonReporter {
  constructor() {
    this.results = {
      tests: [],
    };
  }

  /**
   * @param {FullConfig} config
   * @param {Suite} suite
   */
  onBegin(config, suite) {}

  /**
   * @param {TestCase} test
   * @param {TestResult} result
   */
  onTestBegin(test, result) {
    // Not needed for json output
  }

  /**
   * @param {TestCase} test
   * @param {TestResult} result
   */
  onTestEnd(test, result) {
    this.results.tests.push({
      title: test.title,
      file: test.location.file,
      status: result.status,
    });
  }

  /**
   * @param {FullResult} result
   */
  async onEnd(result) {
    await fs.writeFile(
      "test-results.json",
      JSON.stringify(this.results, null, 2)
    );
  }
}

export default JsonReporter;
