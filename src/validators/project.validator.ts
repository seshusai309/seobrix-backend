import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  websiteUrl: z.string().url('Invalid website URL'),
  description: z.string().max(1000).optional(),
});

export const UpdateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    websiteUrl: z.string().url('Invalid website URL').optional(),
    description: z.string().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'At least one field is required');

export const AssignStaffSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type AssignStaffInput = z.infer<typeof AssignStaffSchema>;
