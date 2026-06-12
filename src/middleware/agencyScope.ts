import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

// Ensures the resource's agencyId matches the caller's agencyId.
// Super Admin bypasses this check entirely.
export const requireAgencyScope = (getAgencyId: (req: Request) => string | undefined) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (user.role === Role.SUPER_ADMIN) {
      next();
      return;
    }

    const resourceAgencyId = getAgencyId(req);
    if (!resourceAgencyId) {
      next();
      return;
    }

    if (user.agencyId !== resourceAgencyId) {
      res.status(403).json({ success: false, message: 'Access denied: cross-agency access is not allowed' });
      return;
    }

    next();
  };
};

// Middleware that injects agencyId from req.user into req.params / req.query
// for routes scoped to the caller's own agency.
export const injectAgencyId = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user && req.user.agencyId) {
    (req as any).agencyId = req.user.agencyId;
  }
  next();
};

// Verify a client belongs to the caller's agency
export const requireClientInAgency = async (
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

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.agencyId !== user.agencyId) {
    res.status(403).json({ success: false, message: 'Client does not belong to your agency' });
    return;
  }

  next();
};
