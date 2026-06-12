import { z } from 'zod';
import { Role } from '@prisma/client';

export const InviteUserSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
    role: z.nativeEnum(Role).refine(
      (r) => r !== Role.SUPER_ADMIN,
      'Cannot invite a Super Admin'
    ),
    // CLIENT invites: the client record this user will be linked to
    clientId: z.string().uuid().optional(),
    // Staff invites (SEO_MANAGER/SEO_EXPERT): workspaces to join on accept
    workspaceIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (d) => d.role !== Role.CLIENT || !!d.clientId,
    { message: 'clientId is required when inviting a CLIENT', path: ['clientId'] }
  );

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(Role).refine(
    (r) => r !== Role.SUPER_ADMIN,
    'Cannot assign Super Admin role'
  ).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, 'At least one field is required');

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
