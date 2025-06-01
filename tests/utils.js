import tmp from "tmp-promise";
import fs from "fs-extra";
import path from "node:path";
import { promisify } from "node:util";
import { exec } from "node:child_process";

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
  await execAsync(`git add ${file}`, { cwd });
}

export async function readJSON(cwd, ...paths) {
  const file = path.join(cwd, ...paths);
  return fs.readJSON(file);
}

const DEFAULT_PEST_CONFIG = {
  vcs: "git",
  baseBranch: "main",
  forceAllTestsFiles: [],
  excludeDirectories: ["node_modules", ".next", ".git"],
  endpointRegex: "^pages/.*\\.js$",
  testFilesRegex: "^tests/.*\\.spec\\.js$",
  testEndpointMapFile: "tests/test-endpoints.json",
  projectRoot: undefined,
};

export async function updatePestConfiguration(cwd, config) {
  const finalConfig = { ...DEFAULT_PEST_CONFIG, ...config };
  const file = path.join(cwd, "pest.config.js");
  await fs.writeFile(
    file,
    `export default ${JSON.stringify(finalConfig, null, 2)};`
  );
}
