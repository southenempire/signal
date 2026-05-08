/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
          {
            source: '/pitch',
            destination: '/pitch.html',
            permanent: true,
          },
        ]
      },
};
export default nextConfig;
