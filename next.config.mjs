/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${process.env.BACKEND_URL || "https://hrms-iui-backend-production.up.railway.app"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
