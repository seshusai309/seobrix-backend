import { z } from 'zod';
import { Role } from '@prisma/client';

export const InviteUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
  role: z.nativeEnum(Role).refine(
    (r) => r !== Role.SUPER_ADMIN,
    'Cannot invite a Super Admin'
  ),
  clientIds: z.array(z.string().uuid()).optional(),
});

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
