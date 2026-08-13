#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { repositoryRoot } from "./boundary-lib.mjs";

const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const routeConfigPattern = /\bmaxDuration\s*(?::|=)/;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(entryPath)));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function findRouteOverrides() {
  const files = [
    ...(await sourceFiles(path.join(repositoryRoot, "app"))),
    ...(await sourceFiles(path.join(repositoryRoot, "pages"))),
  ];
  const violations = [];

  for (const file of files) {
    const lines = (await readFile(file, "utf8")).split("\n");
    for (const [index, line] of lines.entries()) {
      if (routeConfigPattern.test(line)) {
        violations.push(
          `${path.relative(repositoryRoot, file)}:${index + 1}: ${line.trim()}`,
        );
      }
    }
  }

  return violations;
}

async function findVercelJsonOverrides() {
  const vercelJsonPath = path.join(repositoryRoot, "vercel.json");
  const config = JSON.parse(await readFile(vercelJsonPath, "utf8"));
  const functions = config.functions;

  if (!functions || Object.keys(functions).length === 0) return [];

  return [
    "vercel.json: per-function configuration prevents maximum route bundling",
  ];
}

async function findAppHostRoutingViolations() {
  const middlewarePath = path.join(repositoryRoot, "middleware.ts");
  const middleware = await readFile(middlewarePath, "utf8");
  const customDomainFunction = middleware.match(
    /function isCustomDomain\([^)]*\)\s*\{[\s\S]*?\n\}/,
  )?.[0];

  if (customDomainFunction?.includes("process.env.NEXT_PUBLIC_APP_BASE_HOST")) {
    return [];
  }

  return [
    "middleware.ts: isCustomDomain must exempt NEXT_PUBLIC_APP_BASE_HOST",
  ];
}

try {
  const violations = [
    ...(await findRouteOverrides()),
    ...(await findVercelJsonOverrides()),
    ...(await findAppHostRoutingViolations()),
  ];

  if (violations.length > 0) {
    console.error("Vercel self-host configuration is unsafe:");
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Vercel self-host configuration preserves route bundling and app-host routing.",
    );
  }
} catch (error) {
  console.error("Unable to audit Vercel Hobby configuration:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
