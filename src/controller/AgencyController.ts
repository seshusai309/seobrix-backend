import { Request, Response } from 'express';
import { AgencyService } from '../services/agency.service';
import { AppError } from '../utils/errors/app.error';

const agencyService = new AgencyService();

export class AgencyController {
  async getMyAgency(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(200).json({ success: true, data: null });
        return;
      }
      const agency = await agencyService.findById(req.user!.agencyId);
      res.status(200).json({ success: true, data: agency });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async updateMyAgency(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(400).json({ success: false, error: { code: 'NO_AGENCY', message: 'No agency set up yet.' } });
        return;
      }
      const agency = await agencyService.update(req.user!.agencyId, req.body);
      res.status(200).json({ success: true, data: agency });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async setupMyAgency(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Agency name is required.' } });
        return;
      }
      const result = await agencyService.setupMyAgency(req.user!.id, name.trim());
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }
}
