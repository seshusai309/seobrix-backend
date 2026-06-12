import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ success: false, message: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || '') as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ success: false, message: 'Invalid token' });
    } else {
      logger.error('anonymous', 'authenticateToken', error.message);
      res.status(401).json({ success: false, message: 'Authentication failed' });
    }
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

export const requireSuperAdmin = requireRole(Role.SUPER_ADMIN);
export const requireAgencyAdmin = requireRole(Role.AGENCY_ADMIN);
export const requireSeoManager = requireRole(Role.SEO_MANAGER);
export const requireSeoExpert = requireRole(Role.SEO_EXPERT);
export const requireClient = requireRole(Role.CLIENT);

export const requireAgencyMember = requireRole(
  Role.AGENCY_ADMIN,
  Role.SEO_MANAGER,
  Role.SEO_EXPERT
);

export const requireAdminOrExpert = requireRole(
  Role.AGENCY_ADMIN,
  Role.SEO_EXPERT
);

export const requireAdminOrManager = requireRole(
  Role.AGENCY_ADMIN,
  Role.SEO_MANAGER
);
