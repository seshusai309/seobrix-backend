import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { User } from '@prisma/client';
import { UserRepository } from '../repository/UserRepository';
import { InvalidCredentialsError, UnauthorizedError } from '../utils/errors/auth.errors';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { emailService } from '../utils/emailService';
import { RegisterInput } from '../validators/auth.validator';
import { twilioService } from '../utils/twilioService';
import { InviteRepository, hashToken as hashInviteToken } from '../repository/InviteRepository';
import prisma from '../config/db';

const inviteRepo = new InviteRepository();

const userRepo = new UserRepository();

function signAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_ACCESS_SECRET || '',
    { expiresIn: (process.env.JWT_ACCESS_TTL || '15m') as any }
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET || '',
    { expiresIn: (process.env.JWT_REFRESH_TTL || '7d') as any }
  );
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  async login(email: string, password: string) {
    const user = await userRepo.findByEmail(email);
    if (!user || !user.passwordHash) throw new InvalidCredentialsError();
    if (!user.isActive) throw new AppError('Account is deactivated', 'ACCOUNT_INACTIVE', 403);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    return this.issueTokens(user);
  }

  async issueTokens(user: User) {
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);

    await userRepo.setRefreshToken(user.id, hashToken(refreshToken));
    logger.success(user.id, 'issueTokens', `Tokens issued for ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: this.safeUser(user),
    };
  }

  async refresh(rawRefreshToken: string) {
    let payload: { sub: string };
    try {
      payload = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET || '') as { sub: string };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await userRepo.findById(payload.sub);
    if (!user || !user.refreshTokenHash) throw new UnauthorizedError('Session not found');
    if (!user.isActive) throw new AppError('Account is deactivated', 'ACCOUNT_INACTIVE', 403);

    const hash = hashToken(rawRefreshToken);
    if (hash !== user.refreshTokenHash) throw new UnauthorizedError('Refresh token revoked');

    const accessToken = signAccessToken(user.id, user.role);
    const newRefreshToken = signRefreshToken(user.id);
    await userRepo.setRefreshToken(user.id, hashToken(newRefreshToken));

    return { accessToken, refreshToken: newRefreshToken, user: this.safeUser(user) };
  }

  async logout(userId: string) {
    await userRepo.setRefreshToken(userId, null);
    logger.success(userId, 'logout', 'User logged out');
  }

  safeUser(user: User) {
    const { passwordHash, refreshTokenHash, otpCode, otpExpires, ...safe } = user as any;
    return safe;
  }

  // ── Self-signup OTP flow ───────────────────────────────────────────────────

  async checkEmail(email: string): Promise<{ status: 'available' | 'otp_already_sent' | 'otp_resent' }> {
    const existing = await userRepo.findByEmail(email);
    if (!existing) return { status: 'available' };

    if (existing.isActive) {
      throw new AppError('Email is already registered', 'EMAIL_EXISTS', 409);
    }

    // Unverified account exists — check if OTP is still valid
    const existingOtp = (existing as any).otpExpires as Date | null;
    if (existingOtp && existingOtp > new Date()) {
      return { status: 'otp_already_sent' };
    }

    // OTP expired — generate and resend
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await userRepo.updateOtp(existing.id, otp, otpExpires);
    const sent = await emailService.sendOTP(existing.email, otp);
    if (!sent) throw new AppError('Failed to send OTP. Please try again.', 'EMAIL_SEND_FAILED', 503);

    return { status: 'otp_resent' };
  }

  async register(data: RegisterInput): Promise<{ message: string; email: string }> {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) {
      if (existing.isActive) {
        throw new AppError('Email is already registered', 'EMAIL_EXISTS', 409);
      }
      throw new AppError(
        'Email already registered but not verified. Use resend OTP or check your inbox.',
        'EMAIL_PENDING_VERIFICATION',
        409
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create agency + user in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({ data: { name: data.agencyName } });
      return tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: 'AGENCY_ADMIN',
          isActive: false,
          agencyId: agency.id,
        },
      });
    });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await userRepo.updateOtp(user.id, otp, otpExpires);

    const sent = await emailService.sendOTP(data.email, otp);
    if (!sent) {
      throw new AppError(
        'Account created but failed to send verification email. Use /send-otp to resend.',
        'EMAIL_SEND_FAILED',
        503
      );
    }

    logger.success('anonymous', 'register', `New account registered: ${data.email}`);
    return {
      message: 'Account created. Please check your email for the 4-digit verification code.',
      email: data.email,
    };
  }

  async sendOtp(email: string): Promise<{ message: string }> {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new AppError('No account found with this email', 'USER_NOT_FOUND', 404);
    if (user.isActive) throw new AppError('Account is already verified', 'ALREADY_VERIFIED', 400);

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await userRepo.updateOtp(user.id, otp, otpExpires);

    const sent = await emailService.sendOTP(email, otp);
    if (!sent) throw new AppError('Failed to send OTP. Please try again.', 'EMAIL_SEND_FAILED', 503);

    return { message: 'OTP sent to your email. It expires in 5 minutes.' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new AppError('No account found with this email', 'USER_NOT_FOUND', 404);
    if (user.isActive) throw new AppError('Account is already verified', 'ALREADY_VERIFIED', 400);

    const storedOtp = (user as any).otpCode as string | null;
    const otpExpires = (user as any).otpExpires as Date | null;

    if (!storedOtp || !otpExpires) {
      throw new AppError('No OTP found. Please request a new one.', 'NO_OTP', 400);
    }
    if (otpExpires < new Date()) {
      throw new AppError('OTP has expired. Please request a new one.', 'OTP_EXPIRED', 400);
    }
    if (storedOtp !== otp) {
      throw new AppError('Invalid OTP. Please check your email and try again.', 'INVALID_OTP', 400);
    }

    await userRepo.clearOtpAndActivate(user.id);
    const activated = await userRepo.findById(user.id);
    logger.success('anonymous', 'verifyOtp', `Account verified and activated: ${email}`);
    return this.issueTokens(activated!);
  }

  // ── SMS OTP flow ───────────────────────────────────────────────────────────

  async sendSmsOtp(phone: string): Promise<{ message: string }> {
    const result = await twilioService.sendOTP(phone);
    if (!result.ok) throw new AppError(result.error || 'Failed to send SMS OTP', 'SMS_SEND_FAILED', 503);
    logger.success('anonymous', 'sendSmsOtp', `SMS OTP sent to ${phone}`);
    return { message: 'OTP sent to your phone. It expires in 10 minutes.' };
  }

  async verifySmsOtp(phone: string, code: string) {
    const result = await twilioService.verifyOTP(phone, code);
    if (!result.approved) {
      throw new AppError(result.error || 'Invalid or expired OTP', 'INVALID_OTP', 400);
    }

    const user = await userRepo.findByPhone(phone);

    if (user && user.isActive) {
      // Number already registered — sign them in
      logger.success(user.id, 'verifySmsOtp', `SMS sign-in: ${phone}`);
      return this.issueTokens(user);
    }

    // Number not registered — issue a short-lived phoneToken for profile step
    const phoneToken = jwt.sign(
      { type: 'phone_verified', phone },
      process.env.JWT_ACCESS_SECRET || '',
      { expiresIn: '10m' }
    );

    logger.success('anonymous', 'verifySmsOtp', `Phone verified, needs profile: ${phone}`);
    return { status: 'needs_profile' as const, phoneToken };
  }

  // ── Invite token flow ──────────────────────────────────────────────────────

  async validateInvite(rawToken: string) {
    const tokenHash = hashInviteToken(rawToken);
    const invite = await inviteRepo.findByHash(tokenHash);

    if (!invite) throw new AppError('Invalid or expired invite link.', 'INVALID_INVITE', 400);
    if (invite.used) throw new AppError('This invite link has already been used.', 'INVITE_USED', 400);
    if (invite.expiresAt < new Date()) throw new AppError('This invite link has expired.', 'INVITE_EXPIRED', 400);

    return { email: invite.email, name: invite.name, role: invite.role };
  }

  async acceptInvite(rawToken: string, password: string) {
    const tokenHash = hashInviteToken(rawToken);
    const invite = await inviteRepo.findByHash(tokenHash);

    if (!invite) throw new AppError('Invalid or expired invite link.', 'INVALID_INVITE', 400);
    if (invite.used) throw new AppError('This invite link has already been used.', 'INVITE_USED', 400);
    if (invite.expiresAt < new Date()) throw new AppError('This invite link has expired.', 'INVITE_EXPIRED', 400);

    const existingUser = await userRepo.findByEmail(invite.email);
    if (existingUser && existingUser.isActive) {
      throw new AppError('Account already active. Please sign in.', 'ALREADY_ACTIVE', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const clientIds: string[] = invite.clientIds ? JSON.parse(invite.clientIds) : [];

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: invite.name,
          email: invite.email,
          passwordHash,
          role: invite.role,
          agencyId: invite.agencyId,
          isActive: true,
          ...(invite.role === 'CLIENT' && clientIds[0]
            ? { clientId: clientIds[0] }
            : {}),
        },
      });

      if (invite.role === 'SEO_MANAGER' && clientIds.length) {
        await tx.clientAssignment.createMany({
          data: clientIds.map((clientId) => ({ clientId, userId: user.id })),
          skipDuplicates: true,
        });
      }

      return user;
    });

    await inviteRepo.markUsed(invite.id);
    logger.success(newUser.id, 'acceptInvite', `Invite accepted: ${invite.email} (${invite.role})`);
    return this.issueTokens(newUser);
  }

  async completePhoneSignup(phoneToken: string, name: string, email: string, agencyName: string) {
    let payload: any;
    try {
      payload = jwt.verify(phoneToken, process.env.JWT_ACCESS_SECRET || '');
    } catch {
      throw new AppError(
        'Session expired. Please request a new OTP and try again.',
        'INVALID_TOKEN',
        400
      );
    }

    if (payload.type !== 'phone_verified' || !payload.phone) {
      throw new AppError('Invalid token.', 'INVALID_TOKEN', 400);
    }

    const phone: string = payload.phone;

    const existingPhone = await userRepo.findByPhone(phone);
    if (existingPhone) {
      throw new AppError('This number is already registered.', 'PHONE_EXISTS', 409);
    }

    const existingEmail = await userRepo.findByEmail(email);
    if (existingEmail) {
      throw new AppError('This email is already registered.', 'EMAIL_EXISTS', 409);
    }

    const newUser = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({ data: { name: agencyName } });
      return tx.user.create({
        data: {
          name,
          email,
          phone,
          role: 'AGENCY_ADMIN',
          isActive: true,
          agencyId: agency.id,
        },
      });
    });

    logger.success('anonymous', 'completePhoneSignup', `Phone account created: ${phone} (${email})`);
    return this.issueTokens(newUser);
  }
}
