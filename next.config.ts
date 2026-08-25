import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
