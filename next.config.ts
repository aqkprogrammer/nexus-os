import path from "node:path";
import type { NextConfig } from "next";

// GitHub Pages only serves static files, so it gets a demo build without the API.
// Route handlers are .ts and pages are .tsx, so narrowing the extensions drops them.
const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: path.resolve(__dirname) },
  env: { NEXT_PUBLIC_STATIC_DEMO: pagesBasePath ? "1" : "" },
  ...(pagesBasePath && {
    output: "export",
    trailingSlash: true,
    basePath: pagesBasePath,
    pageExtensions: ["tsx"],
  }),
};

export default nextConfig;
