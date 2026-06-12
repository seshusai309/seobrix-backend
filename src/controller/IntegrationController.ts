import { Request, Response } from 'express';
import { IntegrationService } from '../services/integration.service';
import { AppError } from '../utils/errors/app.error';

const integrationService = new IntegrationService();

export class IntegrationController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const integrations = await integrationService.listByProject(req.params.projectId);
      res.status(200).json({ success: true, data: integrations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async connectWordPress(req: Request, res: Response): Promise<void> {
    try {
      const integration = await integrationService.connectWordPress(req.params.projectId, req.body);
      res.status(201).json({ success: true, data: integration });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async connectShopify(req: Request, res: Response): Promise<void> {
    try {
      const integration = await integrationService.connectShopify(req.params.projectId, req.body);
      res.status(201).json({ success: true, data: integration });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async test(req: Request, res: Response): Promise<void> {
    try {
      const integration = await integrationService.test(req.params.id);
      res.status(200).json({ success: true, data: integration });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await integrationService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Integration removed' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }
}
