import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // The organizer workspace moved from /admin; keep old bookmarks and emailed links working.
  async redirects() {
    return [
      { source: "/admin", destination: "/organizer/events", permanent: true },
      { source: "/admin/events/:path*", destination: "/organizer/events/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
