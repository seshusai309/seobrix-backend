import { Role } from '@prisma/client';
import { WorkspaceRepository } from '../repository/WorkspaceRepository';
import { UserRepository } from '../repository/UserRepository';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from '../validators/workspace.validator';

const workspaceRepo = new WorkspaceRepository();
const userRepo = new UserRepository();

export class WorkspaceService {
  async create(agencyId: string, input: CreateWorkspaceInput) {
    const workspace = await workspaceRepo.create({
      name: input.name,
      agency: { connect: { id: agencyId } },
    });
    logger.success('system', 'createWorkspace', `Workspace "${workspace.name}" created in agency ${agencyId}`);
    return workspace;
  }

  // AGENCY_ADMIN sees all agency workspaces; staff see only the ones they belong to.
  async listForUser(userId: string, role: Role, agencyId: string) {
    if (role === Role.SEO_MANAGER || role === Role.SEO_EXPERT) {
      return workspaceRepo.findForMember(userId);
    }
    return workspaceRepo.findByAgency(agencyId);
  }

  async findById(id: string) {
    const workspace = await workspaceRepo.findById(id);
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 'WORKSPACE_NOT_FOUND', 404);
    return workspace;
  }

  async update(id: string, input: UpdateWorkspaceInput) {
    await this.findById(id);
    const updated = await workspaceRepo.update(id, input);
    logger.success('system', 'updateWorkspace', `Workspace ${id} updated`);
    return updated;
  }

  async softDelete(id: string) {
    await this.findById(id);
    return workspaceRepo.softDelete(id);
  }

  // ── Membership ──────────────────────────────────────────────────────────────

  async addMember(workspaceId: string, userId: string, agencyId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    if (user.agencyId !== agencyId) throw new AppError('User not in this agency', 'FORBIDDEN', 403);
    if (user.role !== Role.SEO_MANAGER && user.role !== Role.SEO_EXPERT) {
      throw new AppError('Only SEO Managers and SEO Experts can be workspace members', 'INVALID_ROLE', 400);
    }
    const member = await workspaceRepo.addMember(workspaceId, userId);
    logger.success('system', 'addWorkspaceMember', `User ${userId} added to workspace ${workspaceId}`);
    return member;
  }

  async removeMember(workspaceId: string, userId: string) {
    await workspaceRepo.removeMember(workspaceId, userId);
    logger.success('system', 'removeWorkspaceMember', `User ${userId} removed from workspace ${workspaceId}`);
  }

  async getMembers(workspaceId: string) {
    const members = await workspaceRepo.getMembers(workspaceId);
    return members.map((m) => {
      const { passwordHash: _ph, refreshTokenHash: _rt, otpCode: _o, otpExpires: _oe, ...user } = m.user as any;
      return { ...m, user };
    });
  }
}
