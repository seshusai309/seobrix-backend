import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    // Make Express.User = Prisma User so req.user is fully typed everywhere
    interface User extends PrismaUser {}
  }
}

export {};
