/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export -> produces an `out/` directory that Cloudflare Pages serves directly.
  output: 'export',
  // Pages serves static files; Next's image optimizer isn't available, so disable it.
  images: { unoptimized: true },
  // Emit /ranking/index.html instead of /ranking.html so clean URLs work on Pages.
  trailingSlash: true,
};

export default nextConfig;
