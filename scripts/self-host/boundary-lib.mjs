import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const IGNORED_DIRECTORIES = new Set([
  ".agents",
  ".codex",
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "public",
]);

const MODULE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs"];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptDirectory, "../..");

function toRepoPath(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

async function pathExists(candidate) {
  try {
    await stat(candidate);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function walkFiles(root, directory = root) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(root, absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

/** Remove comments while preserving strings and character offsets. */
function stripComments(source) {
  let result = "";
  let state = "code";
  let stringStart = -1;
  const stringRanges = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (character === "\n") {
        state = "code";
        result += character;
      } else {
        result += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        result += "  ";
        index += 1;
        state = "code";
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state === "single" || state === "double" || state === "template") {
      result += character;
      if (character === "\\") {
        if (next !== undefined) {
          result += next;
          index += 1;
        }
        continue;
      }

      if (
        (state === "single" && character === "'") ||
        (state === "double" && character === '"') ||
        (state === "template" && character === "`")
      ) {
        stringRanges.push([stringStart, index + 1]);
        stringStart = -1;
        state = "code";
      }
      continue;
    }

    if (character === "/" && next === "/") {
      result += "  ";
      index += 1;
      state = "line-comment";
    } else if (character === "/" && next === "*") {
      result += "  ";
      index += 1;
      state = "block-comment";
    } else {
      result += character;
      if (character === "'") {
        state = "single";
        stringStart = index;
      }
      if (character === '"') {
        state = "double";
        stringStart = index;
      }
      if (character === "`") {
        state = "template";
        stringStart = index;
      }
    }
  }

  if (stringStart >= 0) stringRanges.push([stringStart, source.length]);
  return { code: result, stringRanges };
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function extractRequestedExports(clause) {
  if (!clause) return [];

  const requested = [];
  const normalized = clause.trim().replace(/^type\s+/, "");
  const braceStart = normalized.indexOf("{");
  const braceEnd = normalized.lastIndexOf("}");

  if (braceStart >= 0 && braceEnd > braceStart) {
    const bindings = normalized.slice(braceStart + 1, braceEnd).split(",");
    for (const binding of bindings) {
      const cleaned = binding.trim().replace(/^type\s+/, "");
      if (!cleaned) continue;
      requested.push(cleaned.split(/\s+as\s+/)[0].trim());
    }
  }

  const prefix = (
    braceStart >= 0 ? normalized.slice(0, braceStart) : normalized
  )
    .replace(/,\s*$/, "")
    .trim();
  if (prefix && !prefix.startsWith("*")) requested.push("default");

  return sortedUnique(requested);
}

function extractModuleReferences(source, file) {
  const references = [];
  const { code, stringRanges } = stripComments(source);
  const coveredRanges = [];
  const startsInsideString = (index) =>
    stringRanges.some(([start, end]) => index > start && index < end);
  const staticPattern =
    /\b(import|export)\s+(?:type\s+)?([^;]*?)\s+from\s*(["'])([^"']+)\3/g;

  for (const match of code.matchAll(staticPattern)) {
    if (startsInsideString(match.index)) continue;
    coveredRanges.push([match.index, match.index + match[0].length]);
    references.push({
      file,
      line: lineNumberAt(code, match.index),
      specifier: match[4],
      requestedExports: extractRequestedExports(match[2]),
    });
  }

  const directPattern = /\b(import|require)\s*(?:\(\s*)?(["'])([^"']+)\2/g;
  for (const match of code.matchAll(directPattern)) {
    if (startsInsideString(match.index)) continue;
    if (
      coveredRanges.some(
        ([start, end]) => match.index >= start && match.index < end,
      )
    ) {
      continue;
    }
    references.push({
      file,
      line: lineNumberAt(code, match.index),
      specifier: match[3],
      requestedExports: [],
    });
  }

  return references;
}

function collectExports(source) {
  const { code, stringRanges } = stripComments(source);
  const exports = new Set();
  const startsInsideString = (index) =>
    stringRanges.some(([start, end]) => index > start && index < end);

  for (const match of code.matchAll(/\bexport\s+default\b/g)) {
    if (!startsInsideString(match.index)) exports.add("default");
  }

  const declarationPattern =
    /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of code.matchAll(declarationPattern)) {
    if (!startsInsideString(match.index)) exports.add(match[1]);
  }

  const listPattern = /\bexport\s*{([^}]+)}/g;
  for (const match of code.matchAll(listPattern)) {
    if (startsInsideString(match.index)) continue;
    for (const binding of match[1].split(",")) {
      const cleaned = binding.trim().replace(/^type\s+/, "");
      if (!cleaned) continue;
      const parts = cleaned.split(/\s+as\s+/);
      exports.add((parts[1] || parts[0]).trim());
    }
  }

  return exports;
}

async function resolveModuleFile(root, target) {
  const base = path.resolve(root, target);
  const candidates = [
    ...MODULE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...MODULE_EXTENSIONS.slice(1).map((extension) =>
      path.join(base, `index${extension}`),
    ),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

function validateManifest(manifest) {
  const errors = [];
  if (manifest?.version !== 1) errors.push("manifest.version must equal 1");
  if (!Array.isArray(manifest?.selfHostFiles)) {
    errors.push("manifest.selfHostFiles must be an array");
  } else {
    const normalized = sortedUnique(manifest.selfHostFiles);
    if (normalized.length !== manifest.selfHostFiles.length) {
      errors.push("manifest.selfHostFiles contains duplicate paths");
    }
    if (
      normalized.some((file, index) => file !== manifest.selfHostFiles[index])
    ) {
      errors.push("manifest.selfHostFiles must be sorted");
    }
    for (const file of manifest.selfHostFiles) {
      if (
        file.startsWith("/") ||
        file.startsWith("ee/") ||
        file.includes("..")
      ) {
        errors.push(`invalid self-host file path: ${file}`);
      }
    }
  }
  if (!Array.isArray(manifest?.eeAllowlist)) {
    errors.push("manifest.eeAllowlist must be an array");
    return errors;
  }

  const normalized = sortedUnique(manifest.eeAllowlist);
  if (normalized.length !== manifest.eeAllowlist.length) {
    errors.push("manifest.eeAllowlist contains duplicate paths");
  }
  if (normalized.some((file, index) => file !== manifest.eeAllowlist[index])) {
    errors.push("manifest.eeAllowlist must be sorted");
  }
  for (const file of manifest.eeAllowlist) {
    if (!file.startsWith("ee/") || file.includes("..")) {
      errors.push(`invalid EE allowlist path: ${file}`);
    }
  }

  if (!manifest?.moduleAliases?.exact || !manifest?.moduleAliases?.wildcard) {
    errors.push(
      "manifest.moduleAliases must define exact and wildcard aliases",
    );
  }
  return errors;
}

export async function loadManifest(root = repositoryRoot) {
  const manifestFile = path.join(root, "scripts/self-host/manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const errors = validateManifest(manifest);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return manifest;
}

export async function listEeFiles(root = repositoryRoot) {
  const eeRoot = path.join(root, "ee");
  if (!(await pathExists(eeRoot))) return [];
  return (await walkFiles(root, eeRoot))
    .map((file) => toRepoPath(root, file))
    .sort();
}

export async function auditBoundary({
  root = repositoryRoot,
  manifest: suppliedManifest,
} = {}) {
  const manifest = suppliedManifest || (await loadManifest(root));
  const errors = validateManifest(manifest);
  const allowed = manifest.eeAllowlist;
  const allowedSet = new Set(allowed);
  const actualEeFiles = await listEeFiles(root);

  for (const file of manifest.selfHostFiles) {
    if (!(await pathExists(path.join(root, file)))) {
      errors.push(`missing protected self-host file: ${file}`);
    }
  }

  for (const file of actualEeFiles) {
    if (!allowedSet.has(file)) errors.push(`unexpected EE file: ${file}`);
  }
  for (const file of allowed) {
    if (!actualEeFiles.includes(file)) errors.push(`missing EE file: ${file}`);
  }

  const tsconfig = JSON.parse(
    await readFile(path.join(root, "tsconfig.json"), "utf8"),
  );
  const configuredPaths = tsconfig?.compilerOptions?.paths || {};
  const expectedPaths = {
    ...Object.fromEntries(
      Object.entries(manifest.moduleAliases.exact).map(
        ([specifier, target]) => [specifier, [target]],
      ),
    ),
    [manifest.moduleAliases.wildcard.specifier]: [
      manifest.moduleAliases.wildcard.target,
    ],
  };

  for (const [specifier, target] of Object.entries(expectedPaths)) {
    if (JSON.stringify(configuredPaths[specifier]) !== JSON.stringify(target)) {
      errors.push(
        `tsconfig alias ${specifier} must equal ${JSON.stringify(target)}`,
      );
    }
  }
  for (const specifier of Object.keys(configuredPaths)) {
    if (specifier.startsWith("@/ee") && !(specifier in expectedPaths)) {
      errors.push(`unexpected tsconfig EE alias: ${specifier}`);
    }
  }

  for (const [specifier, target] of Object.entries(
    manifest.moduleAliases.exact,
  )) {
    const moduleFile = await resolveModuleFile(root, target);
    if (!moduleFile) continue;
    const modulePath = toRepoPath(root, moduleFile);
    if (!allowedSet.has(modulePath)) {
      errors.push(
        `exact EE alias ${specifier} targets a non-allowlisted file: ${modulePath}`,
      );
    }
  }

  const sourceFiles = (await walkFiles(root)).filter((file) =>
    SOURCE_EXTENSIONS.has(path.extname(file)),
  );
  const eeReferences = [];
  const relativeEeReferences = [];
  const eeRoot = path.join(root, "ee");

  for (const absoluteFile of sourceFiles) {
    const file = toRepoPath(root, absoluteFile);
    const source = await readFile(absoluteFile, "utf8");
    for (const reference of extractModuleReferences(source, file)) {
      if (
        reference.specifier === "@/ee" ||
        reference.specifier.startsWith("@/ee/")
      ) {
        eeReferences.push(reference);
      }

      if (!file.startsWith("ee/") && reference.specifier.startsWith(".")) {
        const resolved = path.resolve(
          path.dirname(absoluteFile),
          reference.specifier,
        );
        if (
          resolved === eeRoot ||
          resolved.startsWith(`${eeRoot}${path.sep}`)
        ) {
          relativeEeReferences.push(reference);
        }
      }
    }
  }

  for (const reference of relativeEeReferences) {
    errors.push(
      `relative EE import at ${reference.file}:${reference.line}: ${reference.specifier}`,
    );
  }

  const moduleExports = new Map();
  let exactReferenceCount = 0;
  let wildcardReferenceCount = 0;

  for (const reference of eeReferences) {
    const exactTarget = manifest.moduleAliases.exact[reference.specifier];
    if (!exactTarget && !reference.specifier.startsWith("@/ee/")) {
      errors.push(
        `EE import has no configured alias at ${reference.file}:${reference.line}: ${reference.specifier}`,
      );
      continue;
    }
    const target = exactTarget || manifest.moduleAliases.wildcard.target;
    if (exactTarget) exactReferenceCount += 1;
    else wildcardReferenceCount += 1;

    let exported = moduleExports.get(target);
    if (!exported) {
      const moduleFile = await resolveModuleFile(root, target);
      if (!moduleFile) {
        errors.push(
          `alias target for ${reference.specifier} does not exist: ${target}`,
        );
        continue;
      }
      exported = collectExports(await readFile(moduleFile, "utf8"));
      moduleExports.set(target, exported);
    }

    for (const requestedExport of reference.requestedExports) {
      if (!exported.has(requestedExport)) {
        errors.push(
          `missing export ${requestedExport} for ${reference.specifier} at ${reference.file}:${reference.line}`,
        );
      }
    }
  }

  return {
    errors: sortedUnique(errors),
    summary: {
      eeFiles: actualEeFiles.length,
      exactReferences: exactReferenceCount,
      sourceFiles: sourceFiles.length,
      uniqueEeSpecifiers: new Set(
        eeReferences.map((reference) => reference.specifier),
      ).size,
      wildcardReferences: wildcardReferenceCount,
    },
  };
}

export function formatBoundarySummary(summary) {
  return [
    "Self-host EE boundary is valid.",
    `  allowlisted EE files: ${summary.eeFiles}`,
    `  scanned source files: ${summary.sourceFiles}`,
    `  unique EE specifiers: ${summary.uniqueEeSpecifiers}`,
    `  exact adapter imports: ${summary.exactReferences}`,
    `  wildcard stub imports: ${summary.wildcardReferences}`,
  ].join("\n");
}
