import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Hosts allowed to fetch `/_next/*` dev resources.
 *
 * Next 16 blocks those from any origin it was not told about. Opening the
 * console on a LAN address therefore serves the HTML but **not the client
 * bundle** — so React never hydrates, and the server-rendered "Loading…"
 * splash (AuthGuard's initial `isLoading: true`) stays on screen forever with
 * no error anywhere except one line in the dev server log.
 *
 * Development only; `next build` ignores this entirely.
 */
// Hostnames and glob patterns — NOT CIDR. `192.168.0.0/16` is accepted into
// the array and then matches nothing, which fails exactly like having no entry
// at all: a 403 on every `/_next/` asset and no clue why.
const devOrigins = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '192.168.*.*',
  '10.*.*.*',
  '172.16.*.*',
];

// Set ADMIN_DEV_ORIGIN in .env.local if your machine is on some other range.
if (process.env.ADMIN_DEV_ORIGIN) devOrigins.push(process.env.ADMIN_DEV_ORIGIN);

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: devOrigins,
  turbopack: {
    // Must match outputFileTracingRoot or Next warns and picks one — they
    // disagreed, which is the "Both ... are set" warning in the dev log.
    root: join(__dirname, '..'),
  },
  // The shared API types package lives outside this app's directory. Type
  // declarations are erased at build time, but `endpoint-access.js` and
  // `field-access.js` are real ESM modules the permission layer imports at
  // runtime, so Next has to transpile them like first-party source.
  transpilePackages: ['@civic/api-types'],
  outputFileTracingRoot: join(__dirname, '..'),
};

export default nextConfig;
