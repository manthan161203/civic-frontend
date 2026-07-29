import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // The shared API types package lives outside this app's directory. Type
  // declarations are erased at build time, but `endpoint-access.js` and
  // `field-access.js` are real ESM modules the permission layer imports at
  // runtime, so Next has to transpile them like first-party source.
  transpilePackages: ['@civic/api-types'],
  outputFileTracingRoot: join(__dirname, '..'),
};

export default nextConfig;
