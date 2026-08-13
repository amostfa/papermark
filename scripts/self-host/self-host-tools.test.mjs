import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { auditBoundary, listEeFiles } from "./boundary-lib.mjs";
import {
  mergeInProgress,
  reapplyEeOverlay,
  runGit,
  unmergedFiles,
} from "./git-lib.mjs";

async function write(root, file, contents) {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function withTemporaryDirectory(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "papermark-self-host-"));
  try {
    await run(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

const fixtureManifest = {
  version: 1,
  upstream: { remote: "upstream", url: "unused", branch: "main" },
  selfHostFiles: ["scripts/self-host/tool.mjs"],
  eeAllowlist: ["ee/LICENSE.md", "ee/stubs.tsx"],
  moduleAliases: {
    exact: {},
    wildcard: { specifier: "@/ee/*", target: "./ee/stubs" },
  },
};

test("boundary audit rejects new EE files, relative imports, and exports", async () => {
  await withTemporaryDirectory(async (root) => {
    await write(root, "ee/LICENSE.md", "license\n");
    await write(
      root,
      "scripts/self-host/tool.mjs",
      "export const safe = true;\n",
    );
    await write(
      root,
      "ee/stubs.tsx",
      "export const Widget = () => null; export default Widget;\n",
    );
    await write(
      root,
      "app/page.tsx",
      'import { Widget } from "@/ee/new-feature"; export default Widget;\n',
    );
    await write(
      root,
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          paths: { "@/ee/*": ["./ee/stubs"], "@/*": ["./*"] },
        },
      }),
    );

    const valid = await auditBoundary({ root, manifest: fixtureManifest });
    assert.deepEqual(valid.errors, []);

    await write(root, "ee/enterprise.ts", "export const secret = true;\n");
    await write(
      root,
      "app/page.tsx",
      [
        'import { Missing } from "@/ee/new-feature";',
        'import enterprise from "../ee/enterprise";',
        "export default enterprise;",
      ].join("\n"),
    );

    const invalid = await auditBoundary({ root, manifest: fixtureManifest });
    assert.ok(
      invalid.errors.some((error) => error.includes("unexpected EE file")),
    );
    assert.ok(
      invalid.errors.some((error) => error.includes("relative EE import")),
    );
    assert.ok(
      invalid.errors.some((error) => error.includes("missing export Missing")),
    );
  });
});

test("overlay resolver replaces EE changes but leaves core conflicts", async () => {
  await withTemporaryDirectory(async (root) => {
    runGit(root, ["init"]);
    runGit(root, ["config", "user.name", "Self-host test"]);
    runGit(root, ["config", "user.email", "self-host@example.invalid"]);

    await write(root, "ee/LICENSE.md", "license\n");
    await write(root, "ee/stubs.tsx", "export const source = 'base';\n");
    await write(root, "ee/enterprise.ts", "export const source = 'base';\n");
    await write(
      root,
      "scripts/self-host/tool.mjs",
      "export const source = 'base';\n",
    );
    await write(root, "core.ts", "export const source = 'base';\n");
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "base"]);
    runGit(root, ["branch", "-M", "selfhost"]);
    runGit(root, ["branch", "upstream"]);

    await write(root, "ee/stubs.tsx", "export const source = 'self-host';\n");
    await write(
      root,
      "scripts/self-host/tool.mjs",
      "export const source = 'self-host';\n",
    );
    await write(root, "core.ts", "export const source = 'self-host';\n");
    await rm(path.join(root, "ee/enterprise.ts"));
    runGit(root, ["add", "-A"]);
    runGit(root, ["commit", "-m", "self-host overlay"]);

    runGit(root, ["checkout", "upstream"]);
    await write(root, "ee/stubs.tsx", "export const source = 'upstream';\n");
    await write(
      root,
      "scripts/self-host/tool.mjs",
      "export const source = 'upstream';\n",
    );
    await write(
      root,
      "ee/enterprise.ts",
      "export const source = 'upstream';\n",
    );
    await write(root, "ee/new-enterprise.ts", "export const added = true;\n");
    await write(root, "core.ts", "export const source = 'upstream';\n");
    runGit(root, ["add", "-A"]);
    runGit(root, ["commit", "-m", "upstream EE update"]);

    runGit(root, ["checkout", "selfhost"]);
    const merge = runGit(
      root,
      ["merge", "--no-commit", "--no-ff", "upstream"],
      { allowFailure: true },
    );
    assert.notEqual(merge.status, 0);
    assert.equal(mergeInProgress(root), true);

    const result = await reapplyEeOverlay({
      root,
      manifest: fixtureManifest,
    });
    assert.deepEqual(unmergedFiles(root), ["core.ts"]);
    assert.deepEqual(result.remainingConflicts, ["core.ts"]);
    assert.deepEqual(await listEeFiles(root), fixtureManifest.eeAllowlist);
    assert.equal(
      await readFile(path.join(root, "ee/stubs.tsx"), "utf8"),
      "export const source = 'self-host';\n",
    );
    assert.equal(
      await readFile(path.join(root, "scripts/self-host/tool.mjs"), "utf8"),
      "export const source = 'self-host';\n",
    );
    assert.deepEqual(
      result.restoredSelfHostFiles,
      fixtureManifest.selfHostFiles,
    );
    assert.ok(result.removed.includes("ee/enterprise.ts"));
    assert.ok(result.removed.includes("ee/new-enterprise.ts"));
  });
});
