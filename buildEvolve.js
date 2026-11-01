require("esbuild")
  .build({
    logLevel: "info",
    entryPoints: ["./src/main.js"],
    bundle: true,
    minify: true,
    format: "esm",
    outfile: "evolve/main.js",
  })
  .catch(() => process.exit(1));
