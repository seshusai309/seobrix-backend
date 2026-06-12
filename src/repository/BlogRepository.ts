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
      include: { author: true, client: true },
    });
  }

  async findByClient(clientId: string, status?: BlogStatus): Promise<Blog[]> {
    return prisma.blog.findMany({
      where: { clientId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findByAgencyInReview(agencyId: string): Promise<Blog[]> {
    return prisma.blog.findMany({
      where: { status: BlogStatus.IN_REVIEW, client: { is: { agencyId } } },
      include: { author: true, client: true },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async findPublishedByClient(clientId: string): Promise<Blog[]> {
    return prisma.blog.findMany({
      where: { clientId, status: BlogStatus.PUBLISHED },
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
