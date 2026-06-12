import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Access guards for the Agency → Workspace → Client → Project hierarchy.
//
//   SUPER_ADMIN   → bypasses every check
//   AGENCY_ADMIN  → anything inside their own agency (above the workspace walls)
//   SEO_MANAGER   → workspaces they're a member of + projects they're assigned to
//   SEO_EXPERT    → workspaces they're a member of + projects they're assigned to
//   CLIENT        → only their own client's workspace / projects
// ─────────────────────────────────────────────────────────────────────────────

// Verifies access to a workspace (param :workspaceId). Attaches req.workspace.
export const requireWorkspaceAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const workspaceId = req.params.workspaceId;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || !workspace.isActive) {
    res.status(404).json({ success: false, error: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' } });
    return;
  }

  (req as any).workspace = workspace;

  if (user.role === Role.SUPER_ADMIN) return next();

  // Cross-agency wall
  if (workspace.agencyId !== user.agencyId) {
    res.status(403).json({ success: false, message: 'Access denied: cross-agency access is not allowed' });
    return;
  }

  if (user.role === Role.AGENCY_ADMIN) return next();

  // CLIENT — only the workspace their own client lives in
  if (user.role === Role.CLIENT) {
    if (!user.clientId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    const client = await prisma.client.findUnique({ where: { id: user.clientId } });
    if (!client || client.workspaceId !== workspaceId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    return next();
  }

  // SEO_MANAGER / SEO_EXPERT — must be a member of this workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!membership) {
    res.status(403).json({ success: false, message: 'You are not a member of this workspace' });
    return;
  }
  next();
};

// Verifies access to a client (param :clientId). Attaches req.client.
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

  const clientId = req.params.clientId;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.isActive) {
    res.status(404).json({ success: false, error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' } });
    return;
  }

  (req as any).client = client;

  if (user.role === Role.SUPER_ADMIN) return next();

  if (client.agencyId !== user.agencyId) {
    res.status(403).json({ success: false, message: 'Access denied: cross-agency access is not allowed' });
    return;
  }

  if (user.role === Role.AGENCY_ADMIN) return next();

  if (user.role === Role.CLIENT) {
    if (user.clientId !== clientId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    return next();
  }

  // SEO_MANAGER / SEO_EXPERT — must be a member of the client's workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: client.workspaceId, userId: user.id } },
  });
  if (!membership) {
    res.status(403).json({ success: false, message: 'You do not have access to this client' });
    return;
  }
  next();
};

// Verifies access to a project (param :projectId). Attaches req.project (with client).
export const requireProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const projectId = req.params.projectId;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project || !project.isActive) {
    res.status(404).json({ success: false, error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } });
    return;
  }

  (req as any).project = project;

  if (user.role === Role.SUPER_ADMIN) return next();

  if (project.client.agencyId !== user.agencyId) {
    res.status(403).json({ success: false, message: 'Access denied: cross-agency access is not allowed' });
    return;
  }

  if (user.role === Role.AGENCY_ADMIN) return next();

  if (user.role === Role.CLIENT) {
    if (project.clientId !== user.clientId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    return next();
  }

  // SEO_MANAGER / SEO_EXPERT — must be assigned to this project
  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!assignment) {
    res.status(403).json({ success: false, message: 'You are not assigned to this project' });
    return;
  }
  next();
};
