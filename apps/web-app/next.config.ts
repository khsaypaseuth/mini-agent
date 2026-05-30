import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mini-agent/ui', '@mini-agent/i18n', '@mini-agent/types'],
};

export default nextConfig;
