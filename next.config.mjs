/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingIncludes: { '/api/data': ['./data/dashboard.json'], '/api/innspill': ['./data/innspill.json'], '/api/debatter': ['./data/debatter.json'] },
};
export default nextConfig;
