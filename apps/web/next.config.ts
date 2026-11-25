import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  // This app lives in apps/web beside the Vite lockfile. Keep Turbopack
  // rooted here so it does not treat the repository root as the app.
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
