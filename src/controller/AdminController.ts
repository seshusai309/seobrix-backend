import { Request, Response } from 'express';
import { AgencyService } from '../services/agency.service';
import { AppError } from '../utils/errors/app.error';

const agencyService = new AgencyService();

export class AdminController {
  async createAgency(req: Request, res: Response): Promise<void> {
    try {
      const result = await agencyService.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listAgencies(_req: Request, res: Response): Promise<void> {
    try {
      const agencies = await agencyService.list();
      res.status(200).json({ success: true, data: agencies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async updateAgency(req: Request, res: Response): Promise<void> {
    try {
      const agency = await agencyService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: agency });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async getAgencyStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await agencyService.getStats(req.params.id);
      res.status(200).json({ success: true, data: stats });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }
}
