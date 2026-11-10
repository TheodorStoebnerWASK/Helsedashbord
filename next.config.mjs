/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingIncludes: { '/api/data': ['./data/dashboard.json'] },
};
export default nextConfig;
