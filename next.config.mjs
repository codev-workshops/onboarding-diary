/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static2.kapruka.com",
      },
      {
        protocol: "https",
        hostname: "www.kapruka.com",
      },
      {
        protocol: "https",
        hostname: "kapruka.com",
      },
    ],
  },
};

export default nextConfig;
