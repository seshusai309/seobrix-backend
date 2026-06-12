import prisma from '../config/db';
import { Blog, BlogStatus, Prisma } from '@prisma/client';

export class BlogRepository {
  async create(data: Prisma.BlogCreateInput): Promise<Blog> {
    return prisma.blog.create({ data });
  }

  async findById(id: string): Promise<Blog | null> {
    return prisma.blog.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: string) {
    return prisma.blog.findUnique({
      where: { id },
      include: { author: true, project: { include: { client: true } } },
    });
  }

  async findByProject(projectId: string, status?: BlogStatus): Promise<Blog[]> {
    return prisma.blog.findMany({
      where: { projectId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findByAgencyInReview(agencyId: string): Promise<Blog[]> {
    return prisma.blog.findMany({
      where: { status: BlogStatus.IN_REVIEW, project: { is: { client: { is: { agencyId } } } } },
      include: { author: true, project: { include: { client: true } } },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async findPublishedByProject(projectId: string): Promise<Blog[]> {
    return prisma.blog.findMany({
      where: { projectId, status: BlogStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findPublishedByClient(clientId: string): Promise<Blog[]> {
    return prisma.blog.findMany({
      where: { status: BlogStatus.PUBLISHED, project: { is: { clientId } } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.BlogUpdateInput): Promise<Blog> {
    return prisma.blog.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Blog> {
    return prisma.blog.delete({ where: { id } });
  }
}
