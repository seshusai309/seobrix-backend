import { Router } from 'express';
import { ClientController } from '../controller/ClientController';
import { IntegrationController } from '../controller/IntegrationController';
import { BlogController } from '../controller/BlogController';
import {
  authenticateToken,
  requireAgencyAdmin,
  requireAgencyMember,
  requireSeoManager,
  requireAdminOrExpert,
} from '../middleware/auth';
import { requireClientInAgency } from '../middleware/agencyScope';
import { requireClientAccess } from '../middleware/clientAccess';
import { rateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { CreateClientSchema, UpdateClientSchema, AssignManagerSchema } from '../validators/client.validator';
import { ConnectWordPressSchema, ConnectShopifySchema } from '../validators/integration.validator';
import {
  CreateBlogSchema,
  UpdateBlogSchema,
  ReviewActionSchema,
  PublishBlogSchema,
} from '../validators/blog.validator';

const router = Router();
const clientController = new ClientController();
const integrationController = new IntegrationController();
const blogController = new BlogController();

// ─── Clients ──────────────────────────────────────────────────────────────────

/**
 * @access private (agency member)
 * @route GET /
 * @desc List all clients in the authenticated user's agency
 */
router.get(
  '/',
  rateLimiter({ max: 30 }),
  authenticateToken,
  clientController.list.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /
 * @desc Create a new client under the agency
 */
router.post(
  '/',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  validate(CreateClientSchema),
  clientController.create.bind(clientController)
);

/**
 * @access private (agency member with client access)
 * @route GET /:clientId
 * @desc Get a single client's details
 */
router.get(
  '/:clientId',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  clientController.getById.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route PATCH /:clientId
 * @desc Update a client's name, website URL, or industry
 */
router.patch(
  '/:clientId',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireClientInAgency,
  validate(UpdateClientSchema),
  clientController.update.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:clientId
 * @desc Soft-delete (deactivate) a client
 */
router.delete(
  '/:clientId',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireAgencyAdmin,
  requireClientInAgency,
  clientController.softDelete.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route POST /:clientId/assign-manager
 * @desc Assign an SEO Manager to a client
 */
router.post(
  '/:clientId/assign-manager',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireClientInAgency,
  validate(AssignManagerSchema),
  clientController.assignManager.bind(clientController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:clientId/assign-manager/:userId
 * @desc Remove an SEO Manager assignment from a client
 */
router.delete(
  '/:clientId/assign-manager/:userId',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireAgencyAdmin,
  requireClientInAgency,
  clientController.unassignManager.bind(clientController)
);

// ─── Integrations ─────────────────────────────────────────────────────────────

/**
 * @access private (agency member with client access)
 * @route GET /:clientId/integrations
 * @desc List all CMS integrations for a client
 */
router.get(
  '/:clientId/integrations',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  integrationController.list.bind(integrationController)
);

/**
 * @access private (agency member with client access)
 * @route POST /:clientId/integrations/wordpress
 * @desc Connect a WordPress site (stores Application Password encrypted)
 */
router.post(
  '/:clientId/integrations/wordpress',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  validate(ConnectWordPressSchema),
  integrationController.connectWordPress.bind(integrationController)
);

/**
 * @access private (agency member with client access)
 * @route POST /:clientId/integrations/shopify
 * @desc Connect a Shopify store (stores access token encrypted)
 */
router.post(
  '/:clientId/integrations/shopify',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  validate(ConnectShopifySchema),
  integrationController.connectShopify.bind(integrationController)
);

/**
 * @access private (agency member with client access)
 * @route POST /:clientId/integrations/:id/test
 * @desc Test an integration's connection — marks CONNECTED or BROKEN
 */
router.post(
  '/:clientId/integrations/:id/test',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  integrationController.test.bind(integrationController)
);

/**
 * @access private (AGENCY_ADMIN only)
 * @route DELETE /:clientId/integrations/:id
 * @desc Remove a CMS integration from a client
 */
router.delete(
  '/:clientId/integrations/:id',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireClientInAgency,
  requireAgencyAdmin,
  integrationController.delete.bind(integrationController)
);

// ─── Blogs ────────────────────────────────────────────────────────────────────

/**
 * @access private (agency member with client access)
 * @route GET /:clientId/blogs
 * @desc List all blogs for a client (filterable by status)
 */
router.get(
  '/:clientId/blogs',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  blogController.list.bind(blogController)
);

/**
 * @access private (SEO_MANAGER only)
 * @route POST /:clientId/blogs
 * @desc Create a new blog post in DRAFT status
 */
router.post(
  '/:clientId/blogs',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  requireSeoManager,
  validate(CreateBlogSchema),
  blogController.create.bind(blogController)
);

/**
 * @access private (agency member with client access)
 * @route GET /:clientId/blogs/:id
 * @desc Get a single blog post by ID
 */
router.get(
  '/:clientId/blogs/:id',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  blogController.getById.bind(blogController)
);

/**
 * @access private (SEO_MANAGER only)
 * @route PATCH /:clientId/blogs/:id
 * @desc Edit a blog post (only allowed in DRAFT or CHANGES_REQUESTED status)
 */
router.patch(
  '/:clientId/blogs/:id',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  requireSeoManager,
  validate(UpdateBlogSchema),
  blogController.update.bind(blogController)
);

/**
 * @access private (SEO_MANAGER only)
 * @route DELETE /:clientId/blogs/:id
 * @desc Delete a blog post (only allowed in DRAFT status)
 */
router.delete(
  '/:clientId/blogs/:id',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  requireSeoManager,
  blogController.delete.bind(blogController)
);

// ─── Blog Lifecycle ───────────────────────────────────────────────────────────

/**
 * @access private (SEO_MANAGER only)
 * @route POST /:clientId/blogs/:id/submit
 * @desc Submit a DRAFT or CHANGES_REQUESTED blog for review — notifies reviewers by email
 */
router.post(
  '/:clientId/blogs/:id/submit',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  requireSeoManager,
  blogController.submit.bind(blogController)
);

/**
 * @access private (AGENCY_ADMIN, SEO_EXPERT)
 * @route POST /:clientId/blogs/:id/approve
 * @desc Approve an IN_REVIEW blog — notifies author by email
 */
router.post(
  '/:clientId/blogs/:id/approve',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireClientInAgency,
  requireAdminOrExpert,
  blogController.approve.bind(blogController)
);

/**
 * @access private (AGENCY_ADMIN, SEO_EXPERT)
 * @route POST /:clientId/blogs/:id/request-changes
 * @desc Request changes on an IN_REVIEW blog with optional note — notifies author
 */
router.post(
  '/:clientId/blogs/:id/request-changes',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireClientInAgency,
  requireAdminOrExpert,
  validate(ReviewActionSchema),
  blogController.requestChanges.bind(blogController)
);

/**
 * @access private (AGENCY_ADMIN, SEO_EXPERT)
 * @route POST /:clientId/blogs/:id/reject
 * @desc Reject an IN_REVIEW blog with optional note — notifies author
 */
router.post(
  '/:clientId/blogs/:id/reject',
  rateLimiter({ max: 20 }),
  authenticateToken,
  requireClientInAgency,
  requireAdminOrExpert,
  validate(ReviewActionSchema),
  blogController.reject.bind(blogController)
);

/**
 * @access private (SEO_MANAGER only)
 * @route POST /:clientId/blogs/:id/publish
 * @desc Publish an APPROVED blog to WordPress or Shopify — notifies author
 */
router.post(
  '/:clientId/blogs/:id/publish',
  rateLimiter({ max: 10 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  requireSeoManager,
  validate(PublishBlogSchema),
  blogController.publish.bind(blogController)
);

/**
 * @access private (agency member with client access)
 * @route GET /:clientId/blogs/:id/history
 * @desc Get the full status change history for a blog post
 */
router.get(
  '/:clientId/blogs/:id/history',
  rateLimiter({ max: 30 }),
  authenticateToken,
  requireClientInAgency,
  requireClientAccess,
  blogController.getHistory.bind(blogController)
);

export default router;
