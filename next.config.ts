/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  // Point output file tracing to the project root (fixes the warning)
  outputFileTracingRoot: process.cwd(),
};
export default nextConfig;