require("esbuild")
  .build({
    logLevel: "debug",
    entryPoints: ["./src/main.js"],
    bundle: true,
    minify: false,
    sourcemap : true,
    format: "esm",
    outfile: "evolve/main.js",
  })
  .catch(() => process.exit(1));
