import { z } from 'zod';

export const CreateAgencySchema = z.object({
  name: z.string().min(1, 'Agency name is required').max(200),
  adminName: z.string().min(1, 'Admin name is required').max(100),
  adminEmail: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UpdateAgencySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
}).refine((d) => Object.keys(d).length > 0, 'At least one field is required');

export type CreateAgencyInput = z.infer<typeof CreateAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof UpdateAgencySchema>;
