import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AgencyRepository } from '../repository/AgencyRepository';
import { UserRepository } from '../repository/UserRepository';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { CreateAgencyInput, UpdateAgencyInput } from '../validators/agency.validator';
import prisma from '../config/db';

const agencyRepo = new AgencyRepository();
const userRepo = new UserRepository();

export class AgencyService {
  async create(input: CreateAgencyInput) {
    const existing = await userRepo.findByEmail(input.adminEmail);
    if (existing) throw new AppError('Admin email already in use', 'EMAIL_TAKEN', 409);

    const agency = await agencyRepo.create({ name: input.name });

    const passwordHash = await bcrypt.hash(input.adminPassword, 12);
    const admin = await userRepo.create({
      name: input.adminName,
      email: input.adminEmail,
      passwordHash,
      role: Role.AGENCY_ADMIN,
      agency: { connect: { id: agency.id } },
    });

    logger.success('system', 'createAgency', `Agency ${agency.name} created with admin ${admin.email}`);
    return { agency, admin: { id: admin.id, email: admin.email, name: admin.name } };
  }

  async list() {
    return agencyRepo.findAll();
  }

  async findById(id: string) {
    const agency = await agencyRepo.findById(id);
    if (!agency) throw new AppError('Agency not found', 'AGENCY_NOT_FOUND', 404);
    return agency;
  }

  async update(id: string, input: UpdateAgencyInput) {
    const agency = await agencyRepo.findById(id);
    if (!agency) throw new AppError('Agency not found', 'AGENCY_NOT_FOUND', 404);
    const updated = await agencyRepo.update(id, input);
    logger.success('system', 'updateAgency', `Agency ${id} updated`);
    return updated;
  }

  async setupMyAgency(userId: string, agencyName: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    if (user.agencyId) throw new AppError('Agency already set up', 'AGENCY_EXISTS', 409);

    const { agency, updatedUser } = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({ data: { name: agencyName } });
      const updatedUser = await tx.user.update({ where: { id: userId }, data: { agencyId: agency.id } });
      return { agency, updatedUser };
    });

    logger.success(userId, 'setupMyAgency', `Agency "${agencyName}" created for OAuth user`);
    return { agency, user: updatedUser };
  }

  async getStats(id: string) {
    const agency = await agencyRepo.findById(id);
    if (!agency) throw new AppError('Agency not found', 'AGENCY_NOT_FOUND', 404);
    return agencyRepo.getStats(id);
  }
}
