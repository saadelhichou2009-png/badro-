import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// نستخدم singleton لتفادي فتح اتصالات متعددة أثناء hot-reload في التطوير
export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}
