import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(200),
});

export const UpdateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'At least one field is required');

export const AddWorkspaceMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>;
