import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  // GitHub Pages serves the site from /<repo>/, set by the deploy workflow.
  basePath: process.env.PAGES_BASE_PATH || undefined,
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
