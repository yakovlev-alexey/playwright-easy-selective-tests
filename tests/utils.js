import tmp from "tmp-promise";
import fs from "fs-extra";
import path from "node:path";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { dirname } from "node:path";
import { constants, cp, mkdir, rm, writeFile, appendFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";

export const execAsync = promisify(exec);

export async function prepareTempDir(project = "next-basic") {
  const tmpDir = await tmp.dir({
    unsafeCleanup: true,
  });
  const cwd = tmpDir.path;

  await execAsync(`pnpm deploy --filter=${project} ${cwd}`);
  // specifically copy .gitignore to prevent slow git operations
  await fs.copy(
    path.join(process.cwd(), "examples", project, ".gitignore"),
    path.join(cwd, ".gitignore")
  );

  await initGit(cwd);

  return { tmpDir, cwd };
}

export async function initGit(cwd) {
  await execAsync("git init -b main", { cwd });
  await execAsync("git add .", { cwd });
  await execAsync("git commit -m 'init'", { cwd });
}

export async function appendFile(cwd, file, content) {
  const filePath = path.join(cwd, file);
  await fs.appendFile(filePath, content);
  await execAsync(`git add ${file}`, { cwd }).catch(() => {});
}

export async function writeFile(cwd, file, content) {
  const filePath = path.join(cwd, file);
  await fs.writeFile(filePath, content);
  await execAsync(`git add ${file}`, { cwd }).catch(() => {});
}

export async function readJSON(cwd, ...paths) {
  const file = path.join(cwd, ...paths);
  return fs.readJSON(file);
}

const DEFAULT_PEST_CONFIG = {
  vcs: "git",
  baseBranch: "main",
  forceAllTestsFiles: ["package.json"],
  exclude: ["node_modules", ".next", ".git"],
  endpointRegex: "^pages/api/.*\\.js$",
  testFilesRegex: "^tests/.*\\.test\\.js$",
  testEndpointMapFile: "tests/test-endpoints.json",
  projectRoot: undefined,
  tempDir: ".pest-temp",
  analysisFile: ".pest-temp/.pest-analysis.json",
};

const getEndpointFromUrl = `(url) => {
    try {
      const u = new URL(url, "http://localhost:3000");
      // Next.js serves pages as /about, /, etc. Map to pages/about.js, pages/index.js
      let path = u.pathname;
      if (path === "/") return "pages/index.js";
      if (path.endsWith("/")) path = path.slice(0, -1);
      return \`pages\${path}.js\`;
    } catch {
      return null;
    }
  }`;

export async function updatePestConfiguration(cwd, config) {
  const finalConfig = { ...DEFAULT_PEST_CONFIG, ...config };
  const file = path.join(cwd, "pest.config.js");
  const json = JSON.stringify(finalConfig, null, 2);
  const fullConfig =
    json.slice(0, -1) + `,getEndpointFromUrl:${getEndpointFromUrl}` + "}";
  await fs.writeFile(file, `export default ${fullConfig};`);
}

export async function mockPestAnalysis(
  cwd,
  analysis,
  file = ".pest-temp/.pest-analysis.json"
) {
  const fullAnalysis = {
    runAllTests: false,
    modifiedEndpoints: [],
    modifiedTestFiles: [],
    timestamp: new Date().toISOString(),
    ...analysis,
  };

  const filePath = path.join(cwd, file);
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeJSON(filePath, fullAnalysis);
}

export async function updateTestEndpoints(
  cwd,
  newEndpoints,
  file = "tests/test-endpoints.json"
) {
  const baseContent = await readJSON(cwd, "tests/test-endpoints.json").catch(
    () => ({})
  );
  const updatedContent = { ...baseContent, ...newEndpoints };
  await fs.writeJSON(path.join(cwd, file), updatedContent);
}

export async function createMockWorkerFile(baseDir, tempDir, workerId, data) {
  const workerFilePath = join(baseDir, tempDir, `worker-${workerId}.json`);
  await mkdir(dirname(workerFilePath), { recursive: true });
  await fs.writeFile(workerFilePath, JSON.stringify(data, null, 2));
  return workerFilePath;
}

export async function createMockTestEndpointsFile(
  baseDir,
  relativeFilePath,
  data
) {
  const filePath = join(baseDir, relativeFilePath);
  await mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}
