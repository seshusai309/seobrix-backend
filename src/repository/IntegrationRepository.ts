import prisma from '../config/db';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';

export class IntegrationRepository {
  async create(data: Prisma.IntegrationCreateInput): Promise<Integration> {
    return prisma.integration.create({ data });
  }

  async findById(id: string): Promise<Integration | null> {
    return prisma.integration.findUnique({ where: { id } });
  }

  async findByProject(projectId: string): Promise<Integration[]> {
    return prisma.integration.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.IntegrationUpdateInput): Promise<Integration> {
    return prisma.integration.update({ where: { id }, data });
  }

  async setStatus(id: string, status: IntegrationStatus): Promise<Integration> {
    return prisma.integration.update({
      where: { id },
      data: { status, lastTestedAt: new Date() },
    });
  }

  async delete(id: string): Promise<Integration> {
    return prisma.integration.delete({ where: { id } });
  }
}
