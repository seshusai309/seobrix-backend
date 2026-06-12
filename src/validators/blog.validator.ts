import { z } from 'zod';
import { CmsType } from '@prisma/client';

export const CreateBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  content: z.string().min(1, 'Content is required'),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  featuredImageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

export const UpdateBlogSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .optional(),
  content: z.string().min(1).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal('')),
}).refine((d) => Object.keys(d).length > 0, 'At least one field is required');

export const ReviewActionSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const PublishBlogSchema = z.object({
  cmsType: z.nativeEnum(CmsType),
});

export type CreateBlogInput = z.infer<typeof CreateBlogSchema>;
export type UpdateBlogInput = z.infer<typeof UpdateBlogSchema>;
export type ReviewActionInput = z.infer<typeof ReviewActionSchema>;
export type PublishBlogInput = z.infer<typeof PublishBlogSchema>;
