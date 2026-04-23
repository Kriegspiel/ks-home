import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";

test("serve-static restricts requests to allowed hosts when configured", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ks-home-serve-static-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>Stage</title><h1>Stage</h1>");
  fs.writeFileSync(path.join(root, "404.html"), "<!doctype html><title>Missing</title><h1>Missing</h1>");

  const port = await findOpenPort();
  const server = spawn(process.execPath, ["scripts/serve-static.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DIST_DIR: root,
      HOST: "127.0.0.1",
      PORT: String(port),
      KS_ALLOWED_HOSTS: "www-stage.kriegspiel.org,localhost,127.0.0.1"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  server.stderr.setEncoding("utf8");
  server.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  t.after(async () => {
    if (server.exitCode === null) server.kill("SIGTERM");
    await once(server, "exit").catch(() => {});
  });

  await waitForServer(port, () => stderr);

  const allowed = await requestStaticPage(port, "www-stage.kriegspiel.org");
  assert.equal(allowed.statusCode, 200);
  assert.match(allowed.body, /<h1>Stage<\/h1>/);

  const blocked = await requestStaticPage(port, "stage.kriegspiel.org");
  assert.equal(blocked.statusCode, 404);
  assert.match(blocked.body, /Missing/);
});

function requestStaticPage(port, hostHeader) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/",
      method: "GET",
      headers: { Host: hostHeader }
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer(port, readStderr) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await requestStaticPage(port, "127.0.0.1");
      if (response.statusCode === 200) return;
    } catch {
      // Keep polling until the server binds the socket.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for serve-static.mjs to start.\n${readStderr()}`);
}

function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}
