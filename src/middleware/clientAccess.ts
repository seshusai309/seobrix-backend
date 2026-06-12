import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

// Ensures SEO_MANAGER is assigned to the requested client.
// AGENCY_ADMIN and SEO_EXPERT can access any client in their agency.
// CLIENT users can only access their own clientId.
export const requireClientAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  if (user.role === Role.SUPER_ADMIN) {
    next();
    return;
  }

  const clientId = req.params.clientId;
  if (!clientId) {
    next();
    return;
  }

  if (user.role === Role.CLIENT) {
    if (user.clientId !== clientId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    next();
    return;
  }

  // AGENCY_ADMIN and SEO_EXPERT — any client in their agency is fine (agency scope guard already ran)
  if (user.role === Role.AGENCY_ADMIN || user.role === Role.SEO_EXPERT) {
    next();
    return;
  }

  // SEO_MANAGER — must be assigned
  if (user.role === Role.SEO_MANAGER) {
    const assignment = await prisma.clientAssignment.findUnique({
      where: { clientId_userId: { clientId, userId: user.id } },
    });
    if (!assignment) {
      res.status(403).json({ success: false, message: 'You are not assigned to this client' });
      return;
    }
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Access denied' });
};
