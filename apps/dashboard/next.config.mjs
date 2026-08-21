/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/pitch.html',
        destination: '/pitch',
      },
    ];
  },
};

export default nextConfig;
