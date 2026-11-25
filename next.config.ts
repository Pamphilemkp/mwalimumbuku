import type { NextConfig } from "next";
import { baselineSecurityHeaders } from "./lib/http/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: baselineSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
