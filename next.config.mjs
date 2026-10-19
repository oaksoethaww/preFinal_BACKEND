const nextConfig = {
  reactCompiler: true,
  async rewrites() { return [{ source: '/api/books/:path*', destination: '/api/book/:path*' }]; },
};
export default nextConfig;
