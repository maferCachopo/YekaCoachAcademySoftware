/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: '/api',
    // Add a config value that can be read by the server
    DISABLE_ON_DEMAND_COMPILATION: process.env.NEXT_DISABLE_COMPILATION === 'true' ? 'true' : 'false'
  },
  // Don't use standalone output with custom server
  // output: 'standalone',
  
  // Set proper output configuration
  distDir: '.next',
  poweredByHeader: false,

  // Explicitly disable Next.js logo for production
  reactStrictMode: false,

  // Add rewrites for API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? '/api/:path*'  // In production, use same server
          : 'http://localhost:3001/api/:path*'  // In development, proxy to backend
      }
    ];
  },

  // Put this at root level as recommended
  outputFileTracingExcludes: {
    '*': [
      'node_modules/**',
      '.next/cache/**',
    ],
  },
  
  // Configure on-demand entries
  onDemandEntries: {
    // How long should pages stay in memory
    maxInactiveAge: process.env.NODE_ENV === 'production' ? 60 * 1000 : 60 * 60 * 1000,
    // Number of pages to keep in memory
    pagesBufferLength: process.env.NODE_ENV === 'production' ? 2 : 5,
  },

  // Disable telemetry
  experimental: {
    disableOptimizedLoading: true,
  },
};

export default nextConfig;
