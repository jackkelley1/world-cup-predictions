import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is mounted at /wc (standalone and behind the jtmk.dev proxy), so
  // routes and static assets are all served under that prefix.
  basePath: "/wc",
};

export default nextConfig;
