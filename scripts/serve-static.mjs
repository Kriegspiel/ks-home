import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"]
]);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) {
    args.set(key, true);
  } else {
    args.set(key, next);
    i += 1;
  }
}

const host = String(args.get("host") || process.env.HOST || "127.0.0.1");
const port = Number(args.get("port") || process.env.PORT || 4180);
const root = path.resolve(String(args.get("root") || process.env.DIST_DIR || "dist"));

if (!fs.existsSync(root)) {
  console.error(`Static root not found: ${root}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", Allow: "GET, HEAD" });
      res.end("Method Not Allowed\n");
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.includes("\0")) throw new Error("invalid path");

    let filePath = resolvePath(pathname);
    if (!filePath) {
      filePath = path.join(root, "404.html");
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(method === "HEAD" ? undefined : "Not Found\n");
        return;
      }
      return sendFile(filePath, 404, method, res);
    }

    sendFile(filePath, 200, method, res);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request\n");
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});

function resolvePath(pathname) {
  const candidates = [];
  if (pathname.endsWith("/")) {
    candidates.push(path.join(root, pathname, "index.html"));
  } else {
    candidates.push(path.join(root, pathname));
    candidates.push(path.join(root, `${pathname}.html`));
    candidates.push(path.join(root, pathname, "index.html"));
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) continue;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }
  return null;
}

function sendFile(filePath, status, method, res) {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES.get(ext) || "application/octet-stream";
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
    "Cache-Control": cacheControlFor(filePath)
  });
  if (method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

function cacheControlFor(filePath) {
  return filePath.endsWith(".html") || filePath.endsWith(".json")
    ? "public, max-age=60"
    : "public, max-age=300";
}
