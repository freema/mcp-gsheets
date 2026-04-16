import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node18',
  bundle: true,
  minify: false,
  sourcemap: false,
  clean: true,
  dts: false,
  platform: 'node',
  splitting: false,
  external: [
    'googleapis',
    'google-auth-library',
    '@google-cloud/local-auth',
    'gcp-metadata',
    'gtoken',
    'google-p12-pem',
    'dotenv'
  ],
  noExternal: [
    '@modelcontextprotocol/sdk',
    'zod'
  ],
  onSuccess: 'echo "✅ Build completed successfully!"'
});