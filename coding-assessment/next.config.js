/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: no server at runtime on Vercel; exam runs entirely client-side.
  output: 'export',
  // Disable image optimization (not used; keeps free tier safe).
  images: { unoptimized: true },
  // Free-tier: avoid large bundles.
  reactStrictMode: true,
};

module.exports = nextConfig;
