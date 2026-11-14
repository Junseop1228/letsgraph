import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Routes moved when the navigation became 4 tabs (decisions 2026-11-14); old links keep working.
  async redirects() {
    return [
      { source: "/analysis", destination: "/postings", permanent: false },
      { source: "/analysis/posting/:id/connection", destination: "/connect/:id", permanent: false },
      { source: "/analysis/posting/:id/kit", destination: "/connect/:id/kit", permanent: false },
      { source: "/analysis/posting/:id", destination: "/postings/:id", permanent: false },
      { source: "/manage", has: [{ type: "query", key: "tab", value: "calendar" }], destination: "/postings", permanent: false },
      { source: "/manage", has: [{ type: "query", key: "tab", value: "(watched|usage)" }], destination: "/account", permanent: false },
    ];
  },
};

export default nextConfig;
