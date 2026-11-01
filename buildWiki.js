require("esbuild")
  .build({
    logLevel: "info",
    entryPoints: ["./src/wiki/wiki.js"],
    bundle: true,
    minify: true,
    format: "esm",
    outfile: "wiki/wiki.js",
  })
  .catch(() => process.exit(1));
