import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDB(): Promise<void> {
  // Neon serverless wakes from cold-start — retry a few times
  const MAX = 3;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      await prisma.$connect();
      logger.success('system', 'connectDB', 'PostgreSQL connected via Prisma');
      return;
    } catch (err: any) {
      if (attempt === MAX) throw err;
      logger.warn('system', 'connectDB', `Connection attempt ${attempt} failed — retrying...`);
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
}

export default prisma;
