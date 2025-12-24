import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["laminar-ui"],
  // Use empty turbopack config to allow build - the symlinked package
  // should work via node_modules resolution with transpilePackages
  turbopack: {},
}

export default nextConfig
