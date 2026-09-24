/* Vite build configuration for the accounting application. Keep URLs relative
   so a build can be served beneath a nested path. */
const { defineConfig } = require("vite");

module.exports = defineConfig({
  // The deployable ZIP is designed to work from an extracted folder as well as
  // from a web server. Root-relative assets break when index.html is opened
  // directly, so every generated build URL must stay relative to the package.
  base: "./",
});
