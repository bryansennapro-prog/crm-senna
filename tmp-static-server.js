// Temporary static server for previewing the landing page locally.
// Also exposes POST /__save?name=... to let the browser write optimized assets to disk.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "landing");
const PORT = 4321;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    // Save endpoint: body is base64, ?name=assets/foo.webp
    if (req.method === "POST" && req.url.startsWith("/__save")) {
      const name = new URL(req.url, "http://x").searchParams.get("name") || "";
      const safe = name.replace(/[^a-zA-Z0-9._/-]/g, "");
      const dest = path.join(ROOT, safe);
      if (!dest.startsWith(ROOT)) { res.writeHead(403); return res.end("bad path"); }
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        try {
          fs.writeFileSync(dest, Buffer.from(body, "base64"));
          res.writeHead(200); res.end("saved " + fs.statSync(dest).size);
        } catch (e) { res.writeHead(500); res.end(String(e)); }
      });
      return;
    }

    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log("Landing preview on http://localhost:" + PORT));
