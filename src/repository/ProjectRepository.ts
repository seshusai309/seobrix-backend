import prisma from '../config/db';
import { Project, Prisma } from '@prisma/client';

export class ProjectRepository {
  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return prisma.project.create({ data });
  }

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({ where: { id } });
  }

  async findByIdWithClient(id: string) {
    return prisma.project.findUnique({ where: { id }, include: { client: true } });
  }

  async findByClient(clientId: string): Promise<Project[]> {
    return prisma.project.findMany({
      where: { clientId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Projects a staff member is assigned to (for SEO_MANAGER / SEO_EXPERT).
  async findAssignedToUser(userId: string): Promise<Project[]> {
    const assignments = await prisma.projectAssignment.findMany({
      where: { userId },
      include: { project: true },
    });
    return assignments.map((a) => a.project).filter((p) => p.isActive);
  }

  async update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return prisma.project.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Project> {
    return prisma.project.update({ where: { id }, data: { isActive: false } });
  }

  // ── Assignment ────────────────────────────────────────────────────────────────

  async assignStaff(projectId: string, userId: string) {
    return prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: {},
      create: { projectId, userId },
    });
  }

  async unassignStaff(projectId: string, userId: string) {
    return prisma.projectAssignment.deleteMany({ where: { projectId, userId } });
  }

  async getAssignments(projectId: string) {
    return prisma.projectAssignment.findMany({
      where: { projectId },
      include: { user: true },
    });
  }
}
