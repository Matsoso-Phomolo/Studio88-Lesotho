import { appendFileSync, createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 5174);
const logPath = join(process.cwd(), "serve-dist.log");

function log(message) {
  appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
}

process.on("uncaughtException", (error) => {
  log(`uncaughtException ${error.stack || error.message}`);
});

process.on("exit", (code) => {
  log(`exit ${code}`);
});

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

createServer((req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, safePath);

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(root, "index.html");
    }

    res.setHeader("Content-Type", types[extname(filePath)] || "application/octet-stream");
    createReadStream(filePath).pipe(res);
  } catch (error) {
    log(`request error ${error.stack || error.message}`);
    res.statusCode = 500;
    res.end("Server error");
  }
}).listen(port, "127.0.0.1", () => {
  log(`Studio 88 build served on http://127.0.0.1:${port}`);
});
