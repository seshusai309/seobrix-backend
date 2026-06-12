import { createHash } from 'node:crypto';
import prisma from '../config/db';
import { Role } from '@prisma/client';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export class InviteRepository {
  async create(data: {
    tokenHash: string;
    email: string;
    name: string;
    role: Role;
    agencyId: string;
    clientId?: string | null;
    workspaceIds?: string[];
    expiresAt: Date;
  }) {
    return prisma.inviteToken.create({
      data: {
        tokenHash: data.tokenHash,
        email: data.email,
        name: data.name,
        role: data.role,
        agencyId: data.agencyId,
        clientId: data.clientId ?? null,
        workspaceIds: data.workspaceIds ? JSON.stringify(data.workspaceIds) : null,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByHash(tokenHash: string) {
    return prisma.inviteToken.findUnique({ where: { tokenHash } });
  }

  async markUsed(id: string) {
    return prisma.inviteToken.update({ where: { id }, data: { used: true } });
  }

  async listPendingByAgency(agencyId: string) {
    return prisma.inviteToken.findMany({
      where: { agencyId, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.inviteToken.findUnique({ where: { id } });
  }

  async deleteById(id: string) {
    await prisma.inviteToken.delete({ where: { id } });
  }

  async deleteAllPendingForEmail(email: string, agencyId: string) {
    await prisma.inviteToken.deleteMany({
      where: { email, agencyId, used: false },
    });
  }

  async deleteExpiredForEmail(email: string) {
    await prisma.inviteToken.deleteMany({
      where: { email, used: false, expiresAt: { lt: new Date() } },
    });
  }
}
