import { test as base } from "@playwright/test";
import { createSelectiveTestFixture } from "playwright-easy-selective-tests";
import config from "../pest.config.js";

const [selectiveTestFixture, afterAllHook] = createSelectiveTestFixture(config);

export const test = base.extend({
  selectiveTestFixture: selectiveTestFixture,
});

test.afterAll(afterAllHook);

export const expect = base.expect;
