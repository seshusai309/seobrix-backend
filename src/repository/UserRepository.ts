import prisma from '../config/db';
import { User, Role, Prisma } from '@prisma/client';

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  }

  async findByOAuth(provider: string, providerId: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { provider, providerId } });
  }

  async findByAgency(agencyId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async setRefreshToken(id: string, hash: string | null): Promise<void> {
    await prisma.user.update({ where: { id }, data: { refreshTokenHash: hash } });
  }

  async updateOtp(id: string, code: string, expires: Date): Promise<void> {
    await prisma.user.update({ where: { id }, data: { otpCode: code, otpExpires: expires } });
  }

  async clearOtpAndActivate(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { otpCode: null, otpExpires: null, isActive: true },
    });
  }

  async findMany(where: Prisma.UserWhereInput): Promise<User[]> {
    return prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async countByAgency(agencyId: string): Promise<number> {
    return prisma.user.count({ where: { agencyId } });
  }
}
