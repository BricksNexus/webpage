/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // First React migration: old static URL → App Router
      { source: "/about.html", destination: "/about", permanent: false },
    ];
  },
};

export default nextConfig;
