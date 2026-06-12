import prisma from '../config/db';
import { Client, Prisma } from '@prisma/client';

export class ClientRepository {
  async create(data: Prisma.ClientCreateInput): Promise<Client> {
    return prisma.client.create({ data });
  }

  async findById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { id } });
  }

  async findByAgency(agencyId: string): Promise<Client[]> {
    return prisma.client.findMany({
      where: { agencyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAssignedToManager(userId: string): Promise<Client[]> {
    const assignments = await prisma.clientAssignment.findMany({
      where: { userId },
      include: { client: true },
    });
    return assignments.map((a) => a.client).filter((c) => c.isActive);
  }

  async update(id: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    return prisma.client.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Client> {
    return prisma.client.update({ where: { id }, data: { isActive: false } });
  }

  async assignManager(clientId: string, userId: string) {
    return prisma.clientAssignment.upsert({
      where: { clientId_userId: { clientId, userId } },
      update: {},
      create: { clientId, userId },
    });
  }

  async unassignManager(clientId: string, userId: string) {
    return prisma.clientAssignment.delete({
      where: { clientId_userId: { clientId, userId } },
    });
  }

  async getAssignments(clientId: string) {
    return prisma.clientAssignment.findMany({
      where: { clientId },
      include: { user: true },
    });
  }
}
