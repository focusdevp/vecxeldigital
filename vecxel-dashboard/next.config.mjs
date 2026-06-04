/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['vecxel.focusdevp.qzz.io'],
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
