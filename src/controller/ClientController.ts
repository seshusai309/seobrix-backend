import { Request, Response } from 'express';
import { ClientService } from '../services/client.service';
import { AppError } from '../utils/errors/app.error';

const clientService = new ClientService();

export class ClientController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      const clients = await clientService.listForUser(
        req.user!.id,
        req.user!.role,
        req.user!.agencyId
      );
      res.status(200).json({ success: true, data: clients });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(400).json({ success: false, error: { code: 'NO_AGENCY', message: 'Your account is not linked to an agency. Create an agency first.' } });
        return;
      }
      const client = await clientService.create(req.user!.agencyId, req.body);
      res.status(201).json({ success: true, data: client });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const client = await clientService.findById(req.params.clientId);
      res.status(200).json({ success: true, data: client });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const client = await clientService.update(req.params.clientId, req.body);
      res.status(200).json({ success: true, data: client });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async softDelete(req: Request, res: Response): Promise<void> {
    try {
      await clientService.softDelete(req.params.clientId);
      res.status(200).json({ success: true, message: 'Client removed' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async assignManager(req: Request, res: Response): Promise<void> {
    try {
      const assignment = await clientService.assignManager(
        req.params.clientId,
        req.body.userId,
        req.user!.agencyId!
      );
      res.status(200).json({ success: true, data: assignment });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async unassignManager(req: Request, res: Response): Promise<void> {
    try {
      await clientService.unassignManager(req.params.clientId, req.params.userId);
      res.status(200).json({ success: true, message: 'Manager unassigned' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }
}
