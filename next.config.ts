import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lets a second build run beside the dev server (NEXT_DIST_DIR=.next-test) when testing
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* This is a signed-in, always-live dashboard: every page reads the session and the database on each request,
     so Cache Components (which prerenders a static shell) would only get in the way. */
  cacheComponents: false,
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
