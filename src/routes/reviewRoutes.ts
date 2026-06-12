import { Router } from 'express';
import { ReviewController } from '../controller/ReviewController';
import { authenticateToken, requireAdminOrManager } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const reviewController = new ReviewController();

/**
 * @access private (AGENCY_ADMIN, SEO_MANAGER)
 * @route GET /queue
 * @desc Get all IN_REVIEW blogs across the agency — the reviewer's work queue
 */
router.get(
  '/queue',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireAdminOrManager,
  reviewController.getQueue.bind(reviewController)
);

export default router;
