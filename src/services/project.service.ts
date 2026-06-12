import { Role } from '@prisma/client';
import { ProjectRepository } from '../repository/ProjectRepository';
import { ClientRepository } from '../repository/ClientRepository';
import { UserRepository } from '../repository/UserRepository';
import { WorkspaceRepository } from '../repository/WorkspaceRepository';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { CreateProjectInput, UpdateProjectInput } from '../validators/project.validator';

const projectRepo = new ProjectRepository();
const clientRepo = new ClientRepository();
const userRepo = new UserRepository();
const workspaceRepo = new WorkspaceRepository();

export class ProjectService {
  // Created by the CLIENT user under their own client record.
  async create(clientId: string, input: CreateProjectInput) {
    const client = await clientRepo.findById(clientId);
    if (!client || !client.isActive) throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);

    const project = await projectRepo.create({
      name: input.name,
      websiteUrl: input.websiteUrl,
      description: input.description,
      client: { connect: { id: clientId } },
    });
    logger.success('system', 'createProject', `Project "${project.name}" created for client ${clientId}`);
    return project;
  }

  async listForClient(clientId: string) {
    return projectRepo.findByClient(clientId);
  }

  async listAssignedToUser(userId: string) {
    return projectRepo.findAssignedToUser(userId);
  }

  async findById(id: string) {
    const project = await projectRepo.findById(id);
    if (!project || !project.isActive) throw new AppError('Project not found', 'PROJECT_NOT_FOUND', 404);
    return project;
  }

  async update(id: string, input: UpdateProjectInput) {
    await this.findById(id);
    const updated = await projectRepo.update(id, input);
    logger.success('system', 'updateProject', `Project ${id} updated`);
    return updated;
  }

  async softDelete(id: string) {
    await this.findById(id);
    return projectRepo.softDelete(id);
  }

  // ── Assignment ────────────────────────────────────────────────────────────────

  async assignStaff(projectId: string, userId: string, agencyId: string) {
    const project = await projectRepo.findByIdWithClient(projectId);
    if (!project || !project.isActive) throw new AppError('Project not found', 'PROJECT_NOT_FOUND', 404);

    const user = await userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    if (user.agencyId !== agencyId) throw new AppError('User not in this agency', 'FORBIDDEN', 403);
    if (user.role !== Role.SEO_MANAGER && user.role !== Role.SEO_EXPERT) {
      throw new AppError('Only SEO Managers and SEO Experts can be assigned to projects', 'INVALID_ROLE', 400);
    }

    // The staff member must already be a member of the project's workspace.
    const membership = await workspaceRepo.findMembership(project.client.workspaceId, userId);
    if (!membership) {
      throw new AppError(
        'Add this user to the project\'s workspace before assigning them',
        'NOT_WORKSPACE_MEMBER',
        400
      );
    }

    const assignment = await projectRepo.assignStaff(projectId, userId);
    logger.success('system', 'assignStaff', `User ${userId} assigned to project ${projectId}`);
    return assignment;
  }

  async unassignStaff(projectId: string, userId: string) {
    await projectRepo.unassignStaff(projectId, userId);
    logger.success('system', 'unassignStaff', `User ${userId} unassigned from project ${projectId}`);
  }

  async getAssignments(projectId: string) {
    const assignments = await projectRepo.getAssignments(projectId);
    return assignments.map((a) => {
      const { passwordHash: _ph, refreshTokenHash: _rt, otpCode: _o, otpExpires: _oe, ...user } = a.user as any;
      return { ...a, user };
    });
  }
}
