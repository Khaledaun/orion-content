/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
module.exports = nextConfig;

/** SAFE REWRITES APPENDED: keep API untouched **/
module.exports.rewrites = async () => ([
  { source: "/api/:path*", destination: "/api/:path*" },
]);
