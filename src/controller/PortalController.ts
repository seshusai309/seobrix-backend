import { Request, Response } from 'express';
import { ClientService } from '../services/client.service';
import { ProjectService } from '../services/project.service';
import { BlogService } from '../services/blog.service';
import { AppError } from '../utils/errors/app.error';

const clientService = new ClientService();
const projectService = new ProjectService();
const blogService = new BlogService();

export class PortalController {
  async me(req: Request, res: Response): Promise<void> {
    try {
      const clientId = req.user!.clientId;
      if (!clientId) {
        res.status(400).json({ success: false, error: { code: 'NO_CLIENT_LINKED', message: 'Your account is not linked to a client record' } });
        return;
      }
      const client = await clientService.findById(clientId);
      res.status(200).json({ success: true, data: client });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listProjects(req: Request, res: Response): Promise<void> {
    try {
      const clientId = req.user!.clientId;
      if (!clientId) {
        res.status(400).json({ success: false, error: { code: 'NO_CLIENT_LINKED', message: 'Your account is not linked to a client record' } });
        return;
      }
      const projects = await projectService.listForClient(clientId);
      res.status(200).json({ success: true, data: projects });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listBlogs(req: Request, res: Response): Promise<void> {
    try {
      const clientId = req.user!.clientId;
      if (!clientId) {
        res.status(400).json({ success: false, error: { code: 'NO_CLIENT_LINKED', message: 'Your account is not linked to a client record' } });
        return;
      }
      const blogs = await blogService.findPublishedByClient(clientId);
      res.status(200).json({ success: true, data: blogs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }
}
