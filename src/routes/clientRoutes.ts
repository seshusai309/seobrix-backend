import { Router } from 'express';
import { ClientController } from '../controller/ClientController';
import { ProjectController } from '../controller/ProjectController';
import {
  authenticateToken,
  requireAgencyAdmin,
  requireClient,
} from '../middleware/auth';
import { requireClientAccess } from '../middleware/access';
import { rateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { UpdateClientSchema, MoveClientSchema } from '../validators/client.validator';
import { CreateProjectSchema } from '../validators/project.validator';

const router = Router();
const clientController = new ClientController();
const projectController = new ProjectController();

// ─── Clients ──────────────────────────────────────────────────────────────────

/**
 * @access private (agency member)
 * @route GET /
 * @desc List clients the caller can see (admin: agency-wide; staff: their workspaces)
 */
router.get(
  '/',
  rateLimiter({ max: 30 }),
  authenticateToken,
  clientController.list.bind(clientController)
);

/**
 * @access private (client access)
 * @route GET /:clientId
 */
router.get(
  '/:clientId',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClientAccess,
  clientController.getById.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route PATCH /:clientId
 */
router.patch(
  '/:clientId',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireClientAccess,
  validate(UpdateClientSchema),
  clientController.update.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:clientId
 */
router.delete(
  '/:clientId',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  requireClientAccess,
  clientController.softDelete.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /:clientId/move
 * @desc Move a client (and its projects) to another workspace; staff assignments revoked
 */
router.post(
  '/:clientId/move',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  requireClientAccess,
  validate(MoveClientSchema),
  clientController.move.bind(clientController)
);

// ─── Projects under a client ──────────────────────────────────────────────────

/**
 * @access private (CLIENT only — their own client)
 * @route POST /:clientId/projects
 * @desc Create a project (website property). Only the client can create projects.
 */
router.post(
  '/:clientId/projects',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireClientAccess,
  requireClient,
  validate(CreateProjectSchema),
  projectController.create.bind(projectController)
);

/**
 * @access private (client access)
 * @route GET /:clientId/projects
 * @desc List a client's projects
 */
router.get(
  '/:clientId/projects',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClientAccess,
  projectController.listForClient.bind(projectController)
);

export default router;
