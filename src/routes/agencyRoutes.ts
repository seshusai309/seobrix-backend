import { Router } from 'express';
import { AgencyController } from '../controller/AgencyController';
import { authenticateToken, requireAgencyAdmin } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { UpdateAgencySchema } from '../validators/agency.validator';

const router = Router();
const agencyController = new AgencyController();

/**
 * @access private (agency member)
 * @route GET /
 * @desc Get the authenticated user's own agency details
 */
router.get(
  '/',
  rateLimiter({ max: 30 }),
  authenticateToken,
  agencyController.getMyAgency.bind(agencyController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route PATCH /
 * @desc Update own agency name or settings
 */
router.patch(
  '/',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  validate(UpdateAgencySchema),
  agencyController.updateMyAgency.bind(agencyController)
);

/**
 * @access private (AGENCY_ADMIN without an agency yet)
 * @route POST /setup
 * @desc Create agency for a user who signed up via OAuth and has no agency yet
 */
router.post(
  '/setup',
  rateLimiter({ max: 5 }),
  authenticateToken,
  agencyController.setupMyAgency.bind(agencyController)
);

export default router;
