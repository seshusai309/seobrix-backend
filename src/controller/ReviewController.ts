import { Request, Response } from 'express';
import { BlogService } from '../services/blog.service';

const blogService = new BlogService();

export class ReviewController {
  async getQueue(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user!.agencyId) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      const queue = await blogService.getReviewQueue(req.user!.agencyId);
      res.status(200).json({ success: true, data: queue });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }
}
