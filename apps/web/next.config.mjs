/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@skatehubba/schema'],
  // Next 15.5+ webpack is strict about ESM `.js` import paths. The shared
  // schema package uses `import './enums.js'` (TS-source convention for
  // moduleResolution: NodeNext compat) but the actual files are `.ts`.
  // Map `.js` → `.ts`/`.tsx`/`.js`/`.jsx` so the workspace import resolves.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default nextConfig;
