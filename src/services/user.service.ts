import { randomBytes } from 'node:crypto';
import { Role } from '@prisma/client';
import { UserRepository } from '../repository/UserRepository';
import { ClientRepository } from '../repository/ClientRepository';
import { InviteRepository, hashToken } from '../repository/InviteRepository';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { emailService } from '../utils/emailService';
import { InviteUserInput, UpdateUserInput } from '../validators/user.validator';

const userRepo = new UserRepository();
const clientRepo = new ClientRepository();
const inviteRepo = new InviteRepository();

export class UserService {
  async invite(agencyId: string, input: InviteUserInput) {
    const existing = await userRepo.findByEmail(input.email);
    if (existing && existing.isActive) {
      throw new AppError('This email is already registered', 'EMAIL_TAKEN', 409);
    }

    // Clean up any expired invite tokens for this email
    await inviteRepo.deleteExpiredForEmail(input.email);

    // Generate a 32-byte random token, store its SHA-256 hash
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await inviteRepo.create({
      tokenHash,
      email: input.email,
      name: input.name,
      role: input.role,
      agencyId,
      clientId: input.clientId,
      workspaceIds: input.workspaceIds,
      expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite?token=${rawToken}`;

    emailService.sendInviteEmail(input.email, input.name, input.role, inviteLink).catch(() => {});

    logger.success('system', 'invite', `Invite sent to ${input.email} (${input.role})`);
    return { message: `Invite sent to ${input.email}`, email: input.email };
  }

  async listInvites(agencyId: string) {
    return inviteRepo.listPendingByAgency(agencyId);
  }

  async cancelInvite(inviteId: string, agencyId: string) {
    const invite = await inviteRepo.findById(inviteId);
    if (!invite) throw new AppError('Invite not found', 'NOT_FOUND', 404);
    if (invite.agencyId !== agencyId) throw new AppError('Access denied', 'FORBIDDEN', 403);
    await inviteRepo.deleteById(inviteId);
    logger.success('system', 'cancelInvite', `Invite ${inviteId} cancelled`);
  }

  async resendInvite(inviteId: string, agencyId: string, newEmail?: string) {
    const invite = await inviteRepo.findById(inviteId);
    if (!invite) throw new AppError('Invite not found', 'NOT_FOUND', 404);
    if (invite.agencyId !== agencyId) throw new AppError('Access denied', 'FORBIDDEN', 403);

    const targetEmail = newEmail ? newEmail.toLowerCase().trim() : invite.email;

    if (newEmail && newEmail !== invite.email) {
      const existing = await userRepo.findByEmail(targetEmail);
      if (existing && existing.isActive) {
        throw new AppError('This email is already registered', 'EMAIL_TAKEN', 409);
      }
    }

    // Delete all pending invites for target email in this agency, then delete old invite
    await inviteRepo.deleteAllPendingForEmail(targetEmail, agencyId);
    if (targetEmail !== invite.email) {
      await inviteRepo.deleteById(inviteId);
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const workspaceIds = invite.workspaceIds ? JSON.parse(invite.workspaceIds) : [];

    await inviteRepo.create({
      tokenHash,
      email: targetEmail,
      name: invite.name,
      role: invite.role,
      agencyId,
      clientId: invite.clientId,
      workspaceIds,
      expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite?token=${rawToken}`;
    emailService.sendInviteEmail(targetEmail, invite.name, invite.role, inviteLink).catch(() => {});

    logger.success('system', 'resendInvite', `Invite resent to ${targetEmail}`);
    return { message: `Invite resent to ${targetEmail}`, email: targetEmail };
  }

  async listByAgency(agencyId: string) {
    const users = await userRepo.findByAgency(agencyId);
    return users.map(({ passwordHash: _ph, refreshTokenHash: _rt, ...u }) => u);
  }

  async update(id: string, actorAgencyId: string, input: UpdateUserInput) {
    const user = await userRepo.findById(id);
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    if (user.agencyId !== actorAgencyId) throw new AppError('Access denied', 'FORBIDDEN', 403);

    const updated = await userRepo.update(id, input);
    logger.success(id, 'update', `User ${id} updated`);
    const { passwordHash: _ph, refreshTokenHash: _rt, ...safe } = updated;
    return safe;
  }

  async deactivate(id: string, actorAgencyId: string) {
    const user = await userRepo.findById(id);
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    if (user.agencyId !== actorAgencyId) throw new AppError('Access denied', 'FORBIDDEN', 403);

    const updated = await userRepo.update(id, { isActive: false });
    logger.success(id, 'deactivate', `User ${id} deactivated`);
    const { passwordHash: _ph, refreshTokenHash: _rt, ...safe } = updated;
    return safe;
  }
}
