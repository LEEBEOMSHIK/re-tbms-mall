import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingExcludes: {
    '/*': ['../../services/api/.env', '**/.env', '**/.env.*'],
  },
  outputFileTracingIncludes: {
    '/*': ['../../workboard.md'],
    '/admin/guide/images/*': ['./guide-assets/*.jpg'],
  },
};

export default nextConfig;
