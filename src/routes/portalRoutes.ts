import { Router } from 'express';
import { PortalController } from '../controller/PortalController';
import { authenticateToken, requireClient } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const portalController = new PortalController();

/**
 * @access private (CLIENT only)
 * @route GET /me
 * @desc Get the client user's own profile and linked client record
 */
router.get(
  '/me',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClient,
  portalController.me.bind(portalController)
);

/**
 * @access private (CLIENT only)
 * @route GET /projects
 * @desc Get the client's own projects
 */
router.get(
  '/projects',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClient,
  portalController.listProjects.bind(portalController)
);

/**
 * @access private (CLIENT only)
 * @route GET /blogs
 * @desc Get all published blogs across the client's projects
 */
router.get(
  '/blogs',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClient,
  portalController.listBlogs.bind(portalController)
);

export default router;
