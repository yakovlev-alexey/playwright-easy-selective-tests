import { test as base } from "@playwright/test";
import { createSelectiveTestFixture } from "playwright-easy-selective-tests/fixture";

function getEndpointFromUrl(url) {
  try {
    const u = new URL(url, "http://localhost");
    // Next.js serves pages as /about, /, etc. Map to pages/about.js, pages/index.js
    let path = u.pathname;
    if (path === "/") return "pages/index.js";
    if (path.endsWith("/")) path = path.slice(0, -1);
    return `pages${path}.js`;
  } catch {
    return null;
  }
}

export const test = base.extend({
  page: createSelectiveTestFixture({
    analysisFile: ".pest-temp/.pest-analysis.json",
    endpointMapFile: "test-endpoints.json",
    getEndpointFromUrl,
  }),
});

export const expect = base.expect;
