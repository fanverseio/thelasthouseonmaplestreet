import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ConfigError, loadServerConfig } from './config.ts';
import { createLocalServer } from './server.ts';

/**
 * Local API entry point (APP_MODE=local by default).
 * Started by `npm run dev` through scripts/dev.mjs, or directly with `node src/local.ts`.
 */
const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    console.error(`Could not read .env: ${(error as Error).message}`);
    process.exit(1);
  }
}

let config;
try {
  config = loadServerConfig(process.env);
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`Configuration error: ${error.message}`);
    process.exit(1);
  }
  throw error;
}

const server = createLocalServer(config);

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other process or set PORT in .env.`);
  } else {
    console.error(`Server error: ${error.message}`);
  }
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  const ai = config.llm.protocol ? `LLM protocol: ${config.llm.protocol}` : 'no LLM configured (Classic Mode only)';
  console.log(`Listening on http://${config.host}:${config.port} (mode: ${config.appMode}; ${ai})`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
