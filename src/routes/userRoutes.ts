import { Router } from 'express';
import { UserController } from '../controller/UserController';
import { authenticateToken, requireAgencyAdmin } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { InviteUserSchema, UpdateUserSchema } from '../validators/user.validator';

const router = Router();
const userController = new UserController();

/**
 * @access private (agency member)
 * @route GET /
 * @desc List all users in the authenticated user's agency
 */
router.get(
  '/',
  rateLimiter({ max: 30 }),
  authenticateToken,
  userController.list.bind(userController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /invite
 * @desc Invite a new team member to the agency (sends welcome email with temp password)
 */
router.post(
  '/invite',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  validate(InviteUserSchema),
  userController.invite.bind(userController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route PATCH /:id
 * @desc Update a team member's name, role, or active status
 */
router.patch(
  '/:id',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  validate(UpdateUserSchema),
  userController.update.bind(userController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:id
 * @desc Deactivate a team member (soft delete — account remains, login blocked)
 */
router.delete(
  '/:id',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  userController.deactivate.bind(userController)
);

// ─── Invite management ────────────────────────────────────────────────────────

router.get(
  '/invites',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireAgencyAdmin,
  userController.listInvites.bind(userController)
);

router.delete(
  '/invites/:id',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  userController.cancelInvite.bind(userController)
);

router.post(
  '/invites/:id/resend',
  rateLimiter({ max: 5 }),
  authenticateToken,
  requireAgencyAdmin,
  userController.resendInvite.bind(userController)
);

export default router;
