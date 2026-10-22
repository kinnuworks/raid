import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  devIndicators: false,
  // PGlite (local dev database) loads its own WASM and data files; bundling breaks those paths.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Share cards read their fonts from disk at request time.
  outputFileTracingIncludes: { "/**": ["./src/app/fonts/**"] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
