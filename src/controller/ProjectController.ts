import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AppError } from '../utils/errors/app.error';

const projectService = new ProjectService();

export class ProjectController {
  // CLIENT creates a project under their own client record.
  async create(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectService.create(req.params.clientId, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listForClient(req: Request, res: Response): Promise<void> {
    try {
      const projects = await projectService.listForClient(req.params.clientId);
      res.status(200).json({ success: true, data: projects });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  // Staff: only the projects assigned to me.
  async listMine(req: Request, res: Response): Promise<void> {
    try {
      const projects = await projectService.listAssignedToUser(req.user!.id);
      res.status(200).json({ success: true, data: projects });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectService.findById(req.params.projectId);
      res.status(200).json({ success: true, data: project });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectService.update(req.params.projectId, req.body);
      res.status(200).json({ success: true, data: project });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      await projectService.softDelete(req.params.projectId);
      res.status(200).json({ success: true, message: 'Project removed' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  // ── Assignment ────────────────────────────────────────────────────────────────

  async assign(req: Request, res: Response): Promise<void> {
    try {
      const assignment = await projectService.assignStaff(
        req.params.projectId,
        req.body.userId,
        req.user!.agencyId!
      );
      res.status(201).json({ success: true, data: assignment });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async unassign(req: Request, res: Response): Promise<void> {
    try {
      await projectService.unassignStaff(req.params.projectId, req.params.userId);
      res.status(200).json({ success: true, message: 'Staff unassigned from project' });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async listAssignments(req: Request, res: Response): Promise<void> {
    try {
      const assignments = await projectService.getAssignments(req.params.projectId);
      res.status(200).json({ success: true, data: assignments });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }
}
