import { spawnSync } from "node:child_process";

const extraArgs = process.argv.slice(2);

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["jest", "--watchman=false", ...extraArgs],
  {
    stdio: "inherit",
    shell: false,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
