import { z } from 'zod';

export const CreateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(200),
  industry: z.string().max(100).optional(),
});

export const UpdateClientSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    industry: z.string().max(100).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'At least one field is required');

export const MoveClientSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type MoveClientInput = z.infer<typeof MoveClientSchema>;
