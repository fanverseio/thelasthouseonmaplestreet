import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

function readPort(value: string | undefined, fallback: number, name: string): number {
  if (!value?.trim()) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a whole number from 1 to 65535 (got "${value}").`);
  }
  return port;
}

export default defineConfig(({ mode }) => {
  // Read only the two port variables from the repository .env. Nothing here reaches the browser:
  // Vite exposes only VITE_* variables, and this project defines none.
  const fileEnv = loadEnv(mode, repoRoot, ['PORT', 'CLIENT_PORT']);
  const env = { ...fileEnv, ...process.env };
  const clientPort = readPort(env.CLIENT_PORT, 5173, 'CLIENT_PORT');
  const apiPort = readPort(env.PORT, 3000, 'PORT');

  return {
    plugins: [react()],
    server: {
      port: clientPort,
      strictPort: true,
      proxy: {
        '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
      },
    },
    preview: { port: clientPort, strictPort: true },
    build: { outDir: 'dist', sourcemap: true },
  };
});
