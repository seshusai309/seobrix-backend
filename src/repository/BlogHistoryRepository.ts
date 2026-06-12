import prisma from '../config/db';
import { BlogHistory } from '@prisma/client';

export class BlogHistoryRepository {
  async record(blogId: string, actorId: string, action: string, note?: string): Promise<BlogHistory> {
    return prisma.blogHistory.create({
      data: { blogId, actorId, action, note },
    });
  }

  async findByBlog(blogId: string): Promise<BlogHistory[]> {
    return prisma.blogHistory.findMany({
      where: { blogId },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
