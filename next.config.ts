// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // إعدادات الصور - Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rnkjilktudnrljwkmffj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};



// تصدير واحد فقط
export default nextConfig;