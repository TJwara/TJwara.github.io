/* Build helper: copy local vendor assets and training files to dist after Vite,
   then verify that the exported HTML uses relative asset paths. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
for (const name of ["js", "vendor"])
  fs.cpSync(path.join(root, "assets", name), path.join(dist, "assets", name), { recursive: true });
if (fs.existsSync(path.join(root, "training-pack")))
  fs.cpSync(path.join(root, "training-pack"), path.join(dist, "training-pack"), {
    recursive: true,
  });
const required = [
  "index.html",
  "assets/js/core.js",
  "assets/js/accounting.js",
  "assets/js/managerial.js",
  "assets/js/reports.js",
  "assets/js/app.js",
];
for (const file of required)
  if (!fs.existsSync(path.join(dist, file))) throw new Error(`Missing build file: ${file}`);
const builtIndex = fs.readFileSync(path.join(dist, "index.html"), "utf8");
if (/(?:src|href)="\/assets\//.test(builtIndex))
  throw new Error(
    "Deployable index contains a root-relative asset URL and will not work when opened from an extracted folder.",
  );
console.log(`Static assets copied; ${required.length} required files verified.`);
