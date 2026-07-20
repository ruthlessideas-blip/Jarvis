/* Tiny zero-dependency static server for the JARVIS desktop launcher.
   Serves the app folder over http://localhost so all features (voice,
   geolocation, camera) run in a secure context. Node only, no installs. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const port = parseInt(process.argv[2] || "4173", 10);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const safe = path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, "");
  const fp = path.join(root, safe);
  if (!fp.startsWith(root)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fp).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log("JARVIS is serving at http://localhost:" + port);
});
