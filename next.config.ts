import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // --- THÊM DÒNG NÀY (QUAN TRỌNG NHẤT) ---
  output: 'standalone',

  // Các config khác (giữ nguyên)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // (Tùy chọn) Giúp debug lỗi build
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;