import { BlogStatus, CmsType, Role } from '@prisma/client';
import { BlogRepository } from '../repository/BlogRepository';
import { BlogHistoryRepository } from '../repository/BlogHistoryRepository';
import { IntegrationRepository } from '../repository/IntegrationRepository';
import { UserRepository } from '../repository/UserRepository';
import { WordPressClient } from '../integrations/wordpress.client';
import { ShopifyClient } from '../integrations/shopify.client';
import { decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';
import { emailService } from '../utils/emailService';
import { AppError } from '../utils/errors/app.error';
import { BlogNotFoundError, BlogNotEditableError, BlogInvalidTransitionError, BlogPublishError } from '../utils/errors/blog.errors';
import { IntegrationNotFoundError } from '../utils/errors/integration.errors';
import { CreateBlogInput, UpdateBlogInput, ReviewActionInput, PublishBlogInput } from '../validators/blog.validator';

const blogRepo = new BlogRepository();
const historyRepo = new BlogHistoryRepository();
const integrationRepo = new IntegrationRepository();
const userRepo = new UserRepository();

export class BlogService {
  async create(projectId: string, authorId: string, input: CreateBlogInput) {
    const blog = await blogRepo.create({
      title: input.title,
      slug: input.slug,
      content: input.content,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      featuredImageUrl: input.featuredImageUrl,
      status: BlogStatus.DRAFT,
      project: { connect: { id: projectId } },
      author: { connect: { id: authorId } },
    });

    await historyRepo.record(blog.id, authorId, 'created');
    logger.success(authorId, 'createBlog', `Blog "${blog.title}" created`);
    return blog;
  }

  async list(projectId: string, _userId: string, role: Role, _agencyId: string, status?: BlogStatus) {
    if (role === Role.CLIENT) {
      return blogRepo.findPublishedByProject(projectId);
    }
    return blogRepo.findByProject(projectId, status);
  }

  async findById(id: string) {
    const blog = await blogRepo.findById(id);
    if (!blog) throw new BlogNotFoundError();
    return blog;
  }

  async update(id: string, actorId: string, input: UpdateBlogInput) {
    const blog = await this.findById(id);

    if (blog.authorId !== actorId) throw new AppError('Only the author can edit this blog', 'FORBIDDEN', 403);
    if (blog.status !== BlogStatus.DRAFT && blog.status !== BlogStatus.CHANGES_REQUESTED) {
      throw new BlogNotEditableError();
    }

    const updated = await blogRepo.update(id, input);
    logger.success(actorId, 'updateBlog', `Blog ${id} updated`);
    return updated;
  }

  async delete(id: string, actorId: string) {
    const blog = await this.findById(id);
    if (blog.authorId !== actorId) throw new AppError('Only the author can delete this blog', 'FORBIDDEN', 403);
    if (blog.status !== BlogStatus.DRAFT) throw new AppError('Only DRAFT blogs can be deleted', 'INVALID_OPERATION', 400);

    await blogRepo.delete(id);
    logger.success(actorId, 'deleteBlog', `Blog ${id} deleted`);
  }

  async submit(id: string, actorId: string) {
    const blog = await this.findById(id);
    if (blog.authorId !== actorId) throw new AppError('Only the author can submit this blog', 'FORBIDDEN', 403);
    if (blog.status !== BlogStatus.DRAFT && blog.status !== BlogStatus.CHANGES_REQUESTED) {
      throw new BlogInvalidTransitionError(blog.status, BlogStatus.IN_REVIEW);
    }

    const updated = await blogRepo.update(id, { status: BlogStatus.IN_REVIEW, reviewer: undefined });
    await historyRepo.record(id, actorId, 'submitted');
    logger.success(actorId, 'submitBlog', `Blog ${id} submitted for review`);

    // Notify all reviewers (AGENCY_ADMIN + SEO_EXPERT) in the agency
    const blogWithRelations = await blogRepo.findByIdWithRelations(id);
    if (blogWithRelations) {
      const { author, project } = blogWithRelations;
      const client = project.client;
      const reviewers = await userRepo.findMany({
        agencyId: client.agencyId,
        role: { in: [Role.AGENCY_ADMIN, Role.SEO_EXPERT] },
        isActive: true,
      });
      for (const r of reviewers) {
        emailService.sendBlogSubmittedNotification(r.email ?? '', r.name, blog.title, client.name, author.name).catch(() => {});
      }
    }

    return updated;
  }

  async approve(id: string, actorId: string) {
    const blog = await this.findById(id);
    if (blog.status !== BlogStatus.IN_REVIEW) throw new BlogInvalidTransitionError(blog.status, BlogStatus.APPROVED);

    const updated = await blogRepo.update(id, {
      status: BlogStatus.APPROVED,
      reviewer: { connect: { id: actorId } },
      reviewerNote: null,
    });
    await historyRepo.record(id, actorId, 'approved');
    logger.success(actorId, 'approveBlog', `Blog ${id} approved`);

    // Notify author
    const blogWithRelations = await blogRepo.findByIdWithRelations(id);
    if (blogWithRelations) {
      const { author, project } = blogWithRelations;
      emailService.sendBlogApproved((author.email ?? ''), author.name, blog.title, project.client.name).catch(() => {});
    }

    return updated;
  }

  async requestChanges(id: string, actorId: string, input: ReviewActionInput) {
    const blog = await this.findById(id);
    if (blog.status !== BlogStatus.IN_REVIEW) throw new BlogInvalidTransitionError(blog.status, BlogStatus.CHANGES_REQUESTED);

    const updated = await blogRepo.update(id, {
      status: BlogStatus.CHANGES_REQUESTED,
      reviewer: { connect: { id: actorId } },
      reviewerNote: input.note,
    });
    await historyRepo.record(id, actorId, 'requested_changes', input.note);
    logger.success(actorId, 'requestChanges', `Blog ${id} sent back for changes`);

    // Notify author
    const [blogWithRelations, reviewer] = await Promise.all([
      blogRepo.findByIdWithRelations(id),
      userRepo.findById(actorId),
    ]);
    if (blogWithRelations && reviewer) {
      const { author, project } = blogWithRelations;
      emailService.sendBlogChangesRequested((author.email ?? ''), author.name, blog.title, project.client.name, reviewer.name, input.note ?? undefined).catch(() => {});
    }

    return updated;
  }

  async reject(id: string, actorId: string, input: ReviewActionInput) {
    const blog = await this.findById(id);
    if (blog.status !== BlogStatus.IN_REVIEW) throw new BlogInvalidTransitionError(blog.status, BlogStatus.REJECTED);

    const updated = await blogRepo.update(id, {
      status: BlogStatus.REJECTED,
      reviewer: { connect: { id: actorId } },
      reviewerNote: input.note,
    });
    await historyRepo.record(id, actorId, 'rejected', input.note);
    logger.success(actorId, 'rejectBlog', `Blog ${id} rejected`);

    // Notify author
    const [blogWithRelations, reviewer] = await Promise.all([
      blogRepo.findByIdWithRelations(id),
      userRepo.findById(actorId),
    ]);
    if (blogWithRelations && reviewer) {
      const { author, project } = blogWithRelations;
      emailService.sendBlogRejected((author.email ?? ''), author.name, blog.title, project.client.name, reviewer.name, input.note ?? undefined).catch(() => {});
    }

    return updated;
  }

  async publish(id: string, actorId: string, input: PublishBlogInput) {
    const blog = await this.findById(id);
    if (blog.authorId !== actorId) throw new AppError('Only the author can publish this blog', 'FORBIDDEN', 403);
    if (blog.status !== BlogStatus.APPROVED) throw new BlogInvalidTransitionError(blog.status, BlogStatus.PUBLISHED);

    // Find an active integration of the requested CMS type for this project
    const integrations = await integrationRepo.findByProject(blog.projectId);
    const integration = integrations.find(
      (i) => i.type === input.cmsType && i.status !== 'DISCONNECTED'
    );

    if (!integration) throw new IntegrationNotFoundError();

    const token = decrypt(integration.tokenEncrypted);
    let cmsPostId: string;
    let livePostUrl: string;

    try {
      if (input.cmsType === CmsType.WORDPRESS) {
        let featuredMediaId: number | null = null;
        if (blog.featuredImageUrl) {
          featuredMediaId = await WordPressClient.uploadMedia(
            integration.siteUrl,
            integration.username || '',
            token,
            blog.featuredImageUrl
          );
        }

        const result = await WordPressClient.createPost(
          integration.siteUrl,
          integration.username || '',
          token,
          {
            title: blog.title,
            content: blog.content,
            slug: blog.slug,
            metaTitle: blog.metaTitle || undefined,
            metaDescription: blog.metaDescription || undefined,
            featuredMediaId,
          }
        );
        cmsPostId = result.id;
        livePostUrl = result.link;
      } else {
        const blogId = await ShopifyClient.getFirstBlogId(integration.siteUrl, token);
        if (!blogId) throw new BlogPublishError('No blog found in Shopify store');

        const result = await ShopifyClient.createArticle(
          integration.siteUrl,
          token,
          blogId,
          {
            title: blog.title,
            content: blog.content,
            slug: blog.slug,
            metaDescription: blog.metaDescription || undefined,
            featuredImageUrl: blog.featuredImageUrl || undefined,
          }
        );
        cmsPostId = result.id;
        livePostUrl = result.link;
      }
    } catch (err: any) {
      // If credentials invalid, mark integration broken
      if (err.message?.includes('invalid')) {
        await integrationRepo.setStatus(integration.id, 'BROKEN');
      }
      throw new BlogPublishError(err.message);
    }

    const updated = await blogRepo.update(id, {
      status: BlogStatus.PUBLISHED,
      cmsType: input.cmsType,
      cmsPostId,
      livePostUrl,
      publishedAt: new Date(),
    });

    await historyRepo.record(id, actorId, 'published');
    logger.success(actorId, 'publishBlog', `Blog ${id} published to ${input.cmsType}: ${livePostUrl}`);

    // Notify author
    const blogWithRelations = await blogRepo.findByIdWithRelations(id);
    if (blogWithRelations) {
      const { author, project } = blogWithRelations;
      emailService.sendBlogPublished([(author.email ?? '')], blog.title, project.client.name, livePostUrl).catch(() => {});
    }

    return updated;
  }

  async getHistory(id: string) {
    await this.findById(id);
    return historyRepo.findByBlog(id);
  }

  async getReviewQueue(agencyId: string) {
    return blogRepo.findByAgencyInReview(agencyId);
  }

  async findPublishedByClient(clientId: string) {
    return blogRepo.findPublishedByClient(clientId);
  }

  async findPublishedByProject(projectId: string) {
    return blogRepo.findPublishedByProject(projectId);
  }
}
