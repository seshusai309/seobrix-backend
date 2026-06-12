import { Router } from 'express';
import { Role } from '@prisma/client';
import { ProjectController } from '../controller/ProjectController';
import { IntegrationController } from '../controller/IntegrationController';
import { BlogController } from '../controller/BlogController';
import {
  authenticateToken,
  requireAgencyAdmin,
  requireAgencyMember,
  requireSeoManager,
  requireAdminOrExpert,
  requireRole,
} from '../middleware/auth';
import { requireProjectAccess } from '../middleware/access';
import { rateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { UpdateProjectSchema, AssignStaffSchema } from '../validators/project.validator';
import { ConnectWordPressSchema, ConnectShopifySchema } from '../validators/integration.validator';
import {
  CreateBlogSchema,
  UpdateBlogSchema,
  ReviewActionSchema,
  PublishBlogSchema,
} from '../validators/blog.validator';

const router = Router();
const projectController = new ProjectController();
const integrationController = new IntegrationController();
const blogController = new BlogController();

// ─── My projects (staff) ──────────────────────────────────────────────────────

/**
 * @access private (SEO_MANAGER, SEO_EXPERT)
 * @route GET /my
 * @desc List only the projects the caller is assigned to
 */
router.get(
  '/my',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireRole(Role.SEO_MANAGER, Role.SEO_EXPERT),
  projectController.listMine.bind(projectController)
);

// ─── Project ──────────────────────────────────────────────────────────────────

/**
 * @access private (project access)
 * @route GET /:projectId
 */
router.get(
  '/:projectId',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireProjectAccess,
  projectController.getById.bind(projectController)
);

/**
 * @access private (CLIENT owner or AGENCY_ADMIN)
 * @route PATCH /:projectId
 */
router.patch(
  '/:projectId',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireProjectAccess,
  requireRole(Role.CLIENT, Role.AGENCY_ADMIN),
  validate(UpdateProjectSchema),
  projectController.update.bind(projectController)
);

/**
 * @access private (CLIENT owner or AGENCY_ADMIN)
 * @route DELETE /:projectId
 */
router.delete(
  '/:projectId',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireProjectAccess,
  requireRole(Role.CLIENT, Role.AGENCY_ADMIN),
  projectController.remove.bind(projectController)
);

// ─── Project assignments (staff) ─────────────────────────────────────────────

/**
 * @access private (AGENCY_ADMIN only)
 * @route GET /:projectId/assignments
 */
router.get(
  '/:projectId/assignments',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireAgencyAdmin,
  requireProjectAccess,
  projectController.listAssignments.bind(projectController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /:projectId/assign
 * @desc Assign an SEO Manager/Expert to this project
 */
router.post(
  '/:projectId/assign',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireProjectAccess,
  validate(AssignStaffSchema),
  projectController.assign.bind(projectController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:projectId/assign/:userId
 */
router.delete(
  '/:projectId/assign/:userId',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireProjectAccess,
  projectController.unassign.bind(projectController)
);

// ─── Integrations ─────────────────────────────────────────────────────────────

router.get(
  '/:projectId/integrations',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireProjectAccess,
  integrationController.list.bind(integrationController)
);

router.post(
  '/:projectId/integrations/wordpress',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireProjectAccess,
  requireAgencyMember,
  validate(ConnectWordPressSchema),
  integrationController.connectWordPress.bind(integrationController)
);

router.post(
  '/:projectId/integrations/shopify',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireProjectAccess,
  requireAgencyMember,
  validate(ConnectShopifySchema),
  integrationController.connectShopify.bind(integrationController)
);

router.post(
  '/:projectId/integrations/:id/test',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireProjectAccess,
  requireAgencyMember,
  integrationController.test.bind(integrationController)
);

router.delete(
  '/:projectId/integrations/:id',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireProjectAccess,
  requireAgencyAdmin,
  integrationController.delete.bind(integrationController)
);

// ─── Blogs ────────────────────────────────────────────────────────────────────

router.get(
  '/:projectId/blogs',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireProjectAccess,
  blogController.list.bind(blogController)
);

router.post(
  '/:projectId/blogs',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireProjectAccess,
  requireSeoManager,
  validate(CreateBlogSchema),
  blogController.create.bind(blogController)
);

router.get(
  '/:projectId/blogs/:id',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireProjectAccess,
  blogController.getById.bind(blogController)
);

router.patch(
  '/:projectId/blogs/:id',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireProjectAccess,
  requireSeoManager,
  validate(UpdateBlogSchema),
  blogController.update.bind(blogController)
);

router.delete(
  '/:projectId/blogs/:id',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireProjectAccess,
  requireSeoManager,
  blogController.delete.bind(blogController)
);

// ─── Blog lifecycle ───────────────────────────────────────────────────────────

router.post(
  '/:projectId/blogs/:id/submit',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireProjectAccess,
  requireSeoManager,
  blogController.submit.bind(blogController)
);

router.post(
  '/:projectId/blogs/:id/approve',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireProjectAccess,
  requireAdminOrExpert,
  blogController.approve.bind(blogController)
);

router.post(
  '/:projectId/blogs/:id/request-changes',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireProjectAccess,
  requireAdminOrExpert,
  validate(ReviewActionSchema),
  blogController.requestChanges.bind(blogController)
);

router.post(
  '/:projectId/blogs/:id/reject',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireProjectAccess,
  requireAdminOrExpert,
  validate(ReviewActionSchema),
  blogController.reject.bind(blogController)
);

router.post(
  '/:projectId/blogs/:id/publish',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireProjectAccess,
  requireSeoManager,
  validate(PublishBlogSchema),
  blogController.publish.bind(blogController)
);

router.get(
  '/:projectId/blogs/:id/history',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireProjectAccess,
  blogController.getHistory.bind(blogController)
);

export default router;
