import { Role } from '@prisma/client';
import { ClientRepository } from '../repository/ClientRepository';
import { UserRepository } from '../repository/UserRepository';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { CreateClientInput, UpdateClientInput } from '../validators/client.validator';

const clientRepo = new ClientRepository();
const userRepo = new UserRepository();

export class ClientService {
  async create(agencyId: string, input: CreateClientInput) {
    const client = await clientRepo.create({
      name: input.name,
      websiteUrl: input.websiteUrl,
      industry: input.industry,
      agency: { connect: { id: agencyId } },
    });
    logger.success('system', 'createClient', `Client ${client.name} created in agency ${agencyId}`);
    return client;
  }

  async listForUser(userId: string, role: Role, agencyId: string) {
    if (role === Role.SEO_MANAGER) {
      return clientRepo.findAssignedToManager(userId);
    }
    return clientRepo.findByAgency(agencyId);
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

  async assignManager(clientId: string, userId: string, agencyId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    if (user.role !== Role.SEO_MANAGER) throw new AppError('User is not an SEO Manager', 'INVALID_ROLE', 400);
    if (user.agencyId !== agencyId) throw new AppError('User not in this agency', 'FORBIDDEN', 403);

    return clientRepo.assignManager(clientId, userId);
  }

  async unassignManager(clientId: string, userId: string) {
    return clientRepo.unassignManager(clientId, userId);
  }

  async getAssignments(clientId: string) {
    return clientRepo.getAssignments(clientId);
  }
}
