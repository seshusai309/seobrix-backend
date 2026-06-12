import { Request, Response } from 'express';
import { BlogStatus } from '@prisma/client';
import { BlogService } from '../services/blog.service';
import { AppError } from '../utils/errors/app.error';

const blogService = new BlogService();

export class BlogController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as BlogStatus | undefined;
      const blogs = await blogService.list(
        req.params.clientId,
        req.user!.id,
        req.user!.role,
        req.user!.agencyId ?? '',
        status
      );
      res.status(200).json({ success: true, data: blogs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.create(req.params.clientId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.findById(req.params.id);
      res.status(200).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.update(req.params.id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await blogService.delete(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Blog deleted' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async submit(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.submit(req.params.id, req.user!.id);
      res.status(200).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.approve(req.params.id, req.user!.id);
      res.status(200).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async requestChanges(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.requestChanges(req.params.id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.reject(req.params.id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async publish(req: Request, res: Response): Promise<void> {
    try {
      const blog = await blogService.publish(req.params.id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: blog });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await blogService.getHistory(req.params.id);
      res.status(200).json({ success: true, data: history });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }
}
