/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ملاحظة: 'standalone' كان مخصصاً لتشغيل Node server داخل Docker.
  // على Netlify، إضافة @netlify/plugin-nextjs تتولى البناء والتشغيل (SSR/Edge Functions)
  // فلا حاجة لهذا الإعداد، بل قد يتعارض معه.
  images: { remotePatterns: [] },
};

module.exports = nextConfig;
