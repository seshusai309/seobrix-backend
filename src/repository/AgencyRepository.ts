import prisma from '../config/db';
import { Agency, AgencyStatus, Prisma } from '@prisma/client';

export class AgencyRepository {
  async create(data: Prisma.AgencyCreateInput): Promise<Agency> {
    return prisma.agency.create({ data });
  }

  async findById(id: string): Promise<Agency | null> {
    return prisma.agency.findUnique({ where: { id } });
  }

  async findAll(): Promise<Agency[]> {
    return prisma.agency.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, data: Prisma.AgencyUpdateInput): Promise<Agency> {
    return prisma.agency.update({ where: { id }, data });
  }

  async getStats(id: string) {
    const [users, clients, blogs] = await Promise.all([
      prisma.user.count({ where: { agencyId: id } }),
      prisma.client.count({ where: { agencyId: id } }),
      prisma.blog.count({ where: { client: { agencyId: id } } }),
    ]);
    return { users, clients, blogs };
  }
}
