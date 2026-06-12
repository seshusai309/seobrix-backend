import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspace.service';
import { ClientService } from '../services/client.service';
import { AppError } from '../utils/errors/app.error';

const workspaceService = new WorkspaceService();
const clientService = new ClientService();

export class WorkspaceController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(400).json({ success: false, error: { code: 'NO_AGENCY', message: 'Complete agency setup before creating workspaces.' } });
        return;
      }
      const workspace = await workspaceService.create(req.user!.agencyId, req.body);
      res.status(201).json({ success: true, data: workspace });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      const workspaces = await workspaceService.listForUser(req.user!.id, req.user!.role, req.user!.agencyId);
      res.status(200).json({ success: true, data: workspaces });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const workspace = await workspaceService.findById(req.params.workspaceId);
      res.status(200).json({ success: true, data: workspace });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const workspace = await workspaceService.update(req.params.workspaceId, req.body);
      res.status(200).json({ success: true, data: workspace });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      await workspaceService.softDelete(req.params.workspaceId);
      res.status(200).json({ success: true, message: 'Workspace removed' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  // ── Membership ──────────────────────────────────────────────────────────────

  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const member = await workspaceService.addMember(req.params.workspaceId, req.body.userId, req.user!.agencyId!);
      res.status(201).json({ success: true, data: member });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      await workspaceService.removeMember(req.params.workspaceId, req.params.userId);
      res.status(200).json({ success: true, message: 'Member removed from workspace' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listMembers(req: Request, res: Response): Promise<void> {
    try {
      const members = await workspaceService.getMembers(req.params.workspaceId);
      res.status(200).json({ success: true, data: members });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  // ── Clients in this workspace ────────────────────────────────────────────────

  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const client = await clientService.create(req.user!.agencyId!, req.params.workspaceId, req.body);
      res.status(201).json({ success: true, data: client });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listClients(req: Request, res: Response): Promise<void> {
    try {
      const clients = await clientService.listForWorkspace(
        req.params.workspaceId,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({ success: true, data: clients });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }
}
