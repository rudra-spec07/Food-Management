import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const server = app.listen(env.PORT, () => {
  console.log(`[Server] Food Donation Management Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await prisma.$disconnect();
    console.log('[Database] Prisma client disconnected.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
