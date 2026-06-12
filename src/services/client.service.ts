import { Role } from '@prisma/client';
import { ClientRepository } from '../repository/ClientRepository';
import { WorkspaceRepository } from '../repository/WorkspaceRepository';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { CreateClientInput, UpdateClientInput } from '../validators/client.validator';

const clientRepo = new ClientRepository();
const workspaceRepo = new WorkspaceRepository();

export class ClientService {
  async create(agencyId: string, workspaceId: string, input: CreateClientInput) {
    const workspace = await workspaceRepo.findById(workspaceId);
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 'WORKSPACE_NOT_FOUND', 404);
    if (workspace.agencyId !== agencyId) throw new AppError('Workspace not in this agency', 'FORBIDDEN', 403);

    const client = await clientRepo.create({
      name: input.name,
      industry: input.industry,
      agency: { connect: { id: agencyId } },
      workspace: { connect: { id: workspaceId } },
    });
    logger.success('system', 'createClient', `Client ${client.name} created in workspace ${workspaceId}`);
    return client;
  }

  // AGENCY_ADMIN sees all agency clients; staff see clients in their workspaces.
  async listForUser(userId: string, role: Role, agencyId: string) {
    if (role === Role.SEO_MANAGER || role === Role.SEO_EXPERT) {
      return clientRepo.findForMember(userId);
    }
    return clientRepo.findByAgency(agencyId);
  }

  async listForWorkspace(workspaceId: string, userId: string, role: Role) {
    const all = await clientRepo.findByWorkspace(workspaceId);
    if (role === Role.SEO_MANAGER || role === Role.SEO_EXPERT) {
      // Staff in the workspace see all its clients (their project assignments
      // further restrict what they can open).
      return all;
    }
    return all;
  }

  async findById(id: string) {
    const client = await clientRepo.findById(id);
    if (!client || !client.isActive) throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    return client;
  }

  async update(id: string, input: UpdateClientInput) {
    await this.findById(id);
    const updated = await clientRepo.update(id, input);
    logger.success('system', 'updateClient', `Client ${id} updated`);
    return updated;
  }

  async softDelete(id: string) {
    await this.findById(id);
    return clientRepo.softDelete(id);
  }

  // Moves a client (and its projects) to another workspace in the same agency.
  // Staff assignments on the client's projects are revoked.
  async moveToWorkspace(clientId: string, targetWorkspaceId: string, agencyId: string) {
    const client = await this.findById(clientId);
    const target = await workspaceRepo.findById(targetWorkspaceId);
    if (!target || !target.isActive) throw new AppError('Target workspace not found', 'WORKSPACE_NOT_FOUND', 404);
    if (target.agencyId !== agencyId || client.agencyId !== agencyId) {
      throw new AppError('Cross-agency move is not allowed', 'FORBIDDEN', 403);
    }
    if (client.workspaceId === targetWorkspaceId) {
      throw new AppError('Client is already in this workspace', 'NO_CHANGE', 400);
    }

    const moved = await clientRepo.moveToWorkspace(clientId, targetWorkspaceId);
    logger.success('system', 'moveClient', `Client ${clientId} moved to workspace ${targetWorkspaceId}; assignments revoked`);
    return moved;
  }
}
