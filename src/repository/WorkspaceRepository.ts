import prisma from '../config/db';
import { Workspace, Prisma } from '@prisma/client';

export class WorkspaceRepository {
  async create(data: Prisma.WorkspaceCreateInput): Promise<Workspace> {
    return prisma.workspace.create({ data });
  }

  async findById(id: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where: { id } });
  }

  async findByAgency(agencyId: string): Promise<Workspace[]> {
    return prisma.workspace.findMany({
      where: { agencyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Workspaces a staff member belongs to (for SEO_MANAGER / SEO_EXPERT).
  async findForMember(userId: string): Promise<Workspace[]> {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });
    return memberships.map((m) => m.workspace).filter((w) => w.isActive);
  }

  async update(id: string, data: Prisma.WorkspaceUpdateInput): Promise<Workspace> {
    return prisma.workspace.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Workspace> {
    return prisma.workspace.update({ where: { id }, data: { isActive: false } });
  }

  // ── Membership ──────────────────────────────────────────────────────────────

  async addMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: {},
      create: { workspaceId, userId },
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.deleteMany({ where: { workspaceId, userId } });
  }

  async getMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
    });
  }

  async findMembership(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }
}
