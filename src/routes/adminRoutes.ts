import { Router } from 'express';
import { AdminController } from '../controller/AdminController';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { CreateAgencySchema, UpdateAgencySchema } from '../validators/agency.validator';

const router = Router();
const adminController = new AdminController();

/**
 * @access private (SUPER_ADMIN only)
 * @route GET /agencies
 * @desc List all agencies on the platform
 */
router.get(
  '/agencies',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireSuperAdmin,
  adminController.listAgencies.bind(adminController)
);

/**
 * @access private (SUPER_ADMIN only)
 * @route POST /agencies
 * @desc Create a new agency
 */
router.post(
  '/agencies',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireSuperAdmin,
  validate(CreateAgencySchema),
  adminController.createAgency.bind(adminController)
);

/**
 * @access private (SUPER_ADMIN only)
 * @route PATCH /agencies/:id
 * @desc Update an agency's name or status
 */
router.patch(
  '/agencies/:id',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireSuperAdmin,
  validate(UpdateAgencySchema),
  adminController.updateAgency.bind(adminController)
);

/**
 * @access private (SUPER_ADMIN only)
 * @route GET /agencies/:id/stats
 * @desc Get user and client counts for an agency
 */
router.get(
  '/agencies/:id/stats',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireSuperAdmin,
  adminController.getAgencyStats.bind(adminController)
);

export default router;
