#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { repositoryRoot } from "./boundary-lib.mjs";

const port = Number.parseInt(process.env.SELF_HOST_SMOKE_PORT || "3017", 10);
const hostname = "127.0.0.1";
const appHost = `localhost:${port}`;
const nextCli = path.join(repositoryRoot, "node_modules/next/dist/bin/next");
const buildId = path.join(repositoryRoot, ".next/BUILD_ID");
let logs = "";

function request({ pathname, method = "GET", body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname,
        port,
        path: pathname,
        method,
        headers: {
          Host: appHost,
          ...(body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
              }
            : {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: response.headers["content-type"],
            status: response.statusCode,
          }),
        );
      },
    );
    request.on("error", reject);
    request.setTimeout(5_000, () =>
      request.destroy(new Error("local server request timed out")),
    );
    if (body) request.write(body);
    request.end();
  });
}

async function waitForServer(child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Next.js exited before becoming ready (${child.exitCode})`,
      );
    }
    try {
      await request({ pathname: "/login" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Next.js did not become ready within 30 seconds");
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) =>
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolve();
      }, 5_000),
    ),
  ]);
}

let server;
try {
  await access(buildId);
  server = spawn(
    process.execPath,
    [nextCli, "start", "--hostname", hostname, "--port", String(port)],
    {
      cwd: repositoryRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => (logs += chunk.toString("utf8")));
  server.stderr.on("data", (chunk) => (logs += chunk.toString("utf8")));

  await waitForServer(server);

  const login = await request({ pathname: "/login" });
  if (
    login.status !== 200 ||
    !login.body.includes("<title>Login | Papermark")
  ) {
    throw new Error(
      `login smoke check failed: status=${login.status}, title missing=${!login.body.includes("<title>Login | Papermark")}`,
    );
  }

  const yearInReviewImage = await request({
    pathname: "/api/og/yir?year=2026&minutesSpentOnDocs=1000",
  });
  if (
    yearInReviewImage.status !== 200 ||
    !yearInReviewImage.contentType?.startsWith("image/png")
  ) {
    throw new Error(
      `year-in-review image smoke check failed: status=${yearInReviewImage.status}, content-type=${yearInReviewImage.contentType}`,
    );
  }

  const eeApi = await request({
    pathname: "/api/teams/self-host/datarooms/self-host/apply-template",
    method: "POST",
    body: "{}",
  });
  if (eeApi.status !== 404) {
    throw new Error(
      `EE API smoke check returned ${eeApi.status}, expected 404`,
    );
  }
  const payload = JSON.parse(eeApi.body);
  if (!String(payload.error).includes("Enterprise Edition feature")) {
    throw new Error("EE API smoke check returned an unexpected response body");
  }

  console.log("Self-host production smoke checks passed:");
  console.log("  login page: 200");
  console.log("  year-in-review image: 200 image/png");
  console.log("  disabled EE API: 404");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (logs.trim()) {
    console.error("Next.js output:");
    console.error(logs.trim());
  }
  process.exitCode = 1;
} finally {
  if (server) await stopServer(server);
}
