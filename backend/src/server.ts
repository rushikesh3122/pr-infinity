import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { ensureAdminUser } from './services/auth.service.js';
import { getSettings } from './services/settings.service.js';

async function main() {
  await connectDatabase(env.MONGODB_URI);
  await ensureAdminUser();
  await getSettings();

  const server = createApp().listen(env.PORT, '0.0.0.0', () => {
    console.log(`PR Infinity API listening on http://0.0.0.0:${env.PORT}/api`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
