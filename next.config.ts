import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Do not write an AGENTS.md into the repository on `next dev`.
  agentRules: false,
  serverExternalPackages: ["pdfkit", "better-sqlite3", "@prisma/adapter-better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/orders/[number]/invoice": ["./assets/fonts/**"],
  },
  images: {
    formats: ["image/webp"],
    qualities: [55, 70],
    deviceSizes: [390, 640, 750, 828, 1080, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 400],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
