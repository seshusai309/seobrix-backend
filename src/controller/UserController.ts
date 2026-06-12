import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../utils/errors/app.error';
import { Role } from '@prisma/client';

const userService = new UserService();

export class UserController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      const users = await userService.listByAgency(req.user!.agencyId);
      res.status(200).json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async invite(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(400).json({ success: false, error: { code: 'NO_AGENCY', message: 'Complete agency setup before inviting members.' } });
        return;
      }
      const user = await userService.invite(req.user!.agencyId, req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.update(req.params.id, req.user!.agencyId!, req.body);
      res.status(200).json({ success: true, data: user });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listInvites(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      const invites = await userService.listInvites(req.user!.agencyId);
      res.status(200).json({ success: true, data: invites });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async cancelInvite(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(400).json({ success: false, error: { code: 'NO_AGENCY', message: 'No agency found.' } });
        return;
      }
      await userService.cancelInvite(req.params.id, req.user!.agencyId);
      res.status(200).json({ success: true, message: 'Invite cancelled' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async resendInvite(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(400).json({ success: false, error: { code: 'NO_AGENCY', message: 'No agency found.' } });
        return;
      }
      const result = await userService.resendInvite(req.params.id, req.user!.agencyId, req.body.email);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(400).json({ success: false, error: { code: 'NO_AGENCY', message: 'No agency found.' } });
        return;
      }
      await userService.deactivate(req.params.id, req.user!.agencyId);
      res.status(200).json({ success: true, message: 'User deactivated' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }
}
