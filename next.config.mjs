/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // First React migration: old static URL → App Router
      { source: "/about.html", destination: "/about", permanent: false },
      // Second React migration: opportunity builder static → App Router
      { source: "/post-opportunity.html", destination: "/post-opportunity", permanent: true },
    ];
  },
};

export default nextConfig;
