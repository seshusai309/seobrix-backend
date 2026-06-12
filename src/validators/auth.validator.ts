import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const CheckEmailSchema = z.object({
  email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  agencyName: z.string().min(2, 'Agency name must be at least 2 characters').max(100).trim(),
});

export const SendOtpSchema = z.object({
  email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
  otp: z
    .string()
    .length(4, 'OTP must be exactly 4 digits')
    .regex(/^\d{4}$/, 'OTP must be numeric'),
});

export const SendSmsOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in E.164 format e.g. +91XXXXXXXXXX'),
});

export const VerifySmsOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in E.164 format'),
  code: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const CompletePhoneSignupSchema = z.object({
  phoneToken: z.string().min(1, 'Phone token is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email').transform((v) => v.toLowerCase().trim()),
  agencyName: z.string().min(2, 'Agency name must be at least 2 characters').max(100).trim(),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type CheckEmailInput = z.infer<typeof CheckEmailSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type SendOtpInput = z.infer<typeof SendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type SendSmsOtpInput = z.infer<typeof SendSmsOtpSchema>;
export type VerifySmsOtpInput = z.infer<typeof VerifySmsOtpSchema>;
export type CompletePhoneSignupInput = z.infer<typeof CompletePhoneSignupSchema>;
