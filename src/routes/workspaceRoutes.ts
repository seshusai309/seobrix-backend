import { Router } from 'express';
import { WorkspaceController } from '../controller/WorkspaceController';
import { authenticateToken, requireAgencyAdmin } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/access';
import { rateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
} from '../validators/workspace.validator';
import { CreateClientSchema } from '../validators/client.validator';

const router = Router();
const workspaceController = new WorkspaceController();

// ─── Workspaces ─────────────────────────────────────────────────────────────

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /
 * @desc Create a new workspace in the caller's agency
 */
router.post(
  '/',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  validate(CreateWorkspaceSchema),
  workspaceController.create.bind(workspaceController)
);

/**
 * @access private (agency member)
 * @route GET /
 * @desc List workspaces — admin sees all in agency; staff see only their own
 */
router.get(
  '/',
  rateLimiter({ max: 30 }),
  authenticateToken,
  workspaceController.list.bind(workspaceController)
);

/**
 * @access private (workspace access)
 * @route GET /:workspaceId
 * @desc Get a single workspace
 */
router.get(
  '/:workspaceId',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireWorkspaceAccess,
  workspaceController.getById.bind(workspaceController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route PATCH /:workspaceId
 * @desc Rename or toggle a workspace
 */
router.patch(
  '/:workspaceId',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireWorkspaceAccess,
  validate(UpdateWorkspaceSchema),
  workspaceController.update.bind(workspaceController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:workspaceId
 * @desc Deactivate a workspace
 */
router.delete(
  '/:workspaceId',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  requireWorkspaceAccess,
  workspaceController.remove.bind(workspaceController)
);

// ─── Workspace members (staff) ───────────────────────────────────────────────

/**
 * @access private (AGENCY_ADMIN only)
 * @route GET /:workspaceId/members
 * @desc List staff members of a workspace
 */
router.get(
  '/:workspaceId/members',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireAgencyAdmin,
  requireWorkspaceAccess,
  workspaceController.listMembers.bind(workspaceController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /:workspaceId/members
 * @desc Add an SEO Manager/Expert to a workspace
 */
router.post(
  '/:workspaceId/members',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireWorkspaceAccess,
  validate(AddWorkspaceMemberSchema),
  workspaceController.addMember.bind(workspaceController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:workspaceId/members/:userId
 * @desc Remove a staff member from a workspace
 */
router.delete(
  '/:workspaceId/members/:userId',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireWorkspaceAccess,
  workspaceController.removeMember.bind(workspaceController)
);

// ─── Clients in this workspace ───────────────────────────────────────────────

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /:workspaceId/clients
 * @desc Add (create) a client inside this workspace
 */
router.post(
  '/:workspaceId/clients',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  requireWorkspaceAccess,
  validate(CreateClientSchema),
  workspaceController.createClient.bind(workspaceController)
);

/**
 * @access private (workspace access)
 * @route GET /:workspaceId/clients
 * @desc List clients in this workspace (staff see only their accessible ones)
 */
router.get(
  '/:workspaceId/clients',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireWorkspaceAccess,
  workspaceController.listClients.bind(workspaceController)
);

export default router;
