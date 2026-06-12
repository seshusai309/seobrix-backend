import { z } from 'zod';

export const ConnectWordPressSchema = z.object({
  siteUrl: z.string().url('Invalid WordPress site URL'),
  username: z.string().min(1, 'WordPress username is required'),
  applicationPassword: z.string().min(1, 'Application password is required'),
});

export const ConnectShopifySchema = z.object({
  siteUrl: z.string().url('Invalid Shopify store URL'),
  accessToken: z.string().min(1, 'Shopify access token is required'),
});

export type ConnectWordPressInput = z.infer<typeof ConnectWordPressSchema>;
export type ConnectShopifyInput = z.infer<typeof ConnectShopifySchema>;
