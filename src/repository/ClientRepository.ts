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

  async findByWorkspace(workspaceId: string): Promise<Client[]> {
    return prisma.client.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Clients in workspaces a staff member belongs to (for SEO_MANAGER / SEO_EXPERT).
  async findForMember(userId: string): Promise<Client[]> {
    return prisma.client.findMany({
      where: {
        isActive: true,
        workspace: { members: { some: { userId } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    return prisma.client.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Client> {
    return prisma.client.update({ where: { id }, data: { isActive: false } });
  }

  // Moves a client to another workspace. Projects follow the client automatically
  // (they derive workspace via the client); every staff project-assignment under
  // this client is wiped, since staff do not move with the client.
  async moveToWorkspace(clientId: string, workspaceId: string): Promise<Client> {
    return prisma.$transaction(async (tx) => {
      const projects = await tx.project.findMany({ where: { clientId }, select: { id: true } });
      const projectIds = projects.map((p) => p.id);
      if (projectIds.length) {
        await tx.projectAssignment.deleteMany({ where: { projectId: { in: projectIds } } });
      }
      return tx.client.update({ where: { id: clientId }, data: { workspaceId } });
    });
  }
}
