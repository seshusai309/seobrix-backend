import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

export class ShopifyClient {
  static async testConnection(siteUrl: string, accessToken: string): Promise<boolean> {
    try {
      const base = siteUrl.replace(/\/$/, '');
      const res = await axios.get(`${base}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
        timeout: 10000,
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  static async getFirstBlogId(siteUrl: string, accessToken: string): Promise<string | null> {
    try {
      const base = siteUrl.replace(/\/$/, '');
      const res = await axios.get(`${base}/admin/api/2024-01/blogs.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
        timeout: 10000,
      });
      const blogs = res.data?.blogs;
      return blogs?.length ? String(blogs[0].id) : null;
    } catch {
      return null;
    }
  }

  static async createArticle(
    siteUrl: string,
    accessToken: string,
    blogId: string,
    article: {
      title: string;
      content: string;
      slug: string;
      metaDescription?: string;
      featuredImageUrl?: string;
    },
    retries = 3
  ): Promise<{ id: string; link: string }> {
    const base = siteUrl.replace(/\/$/, '');
    const body: Record<string, any> = {
      article: {
        title: article.title,
        body_html: article.content,
        handle: article.slug,
        published: true,
        ...(article.metaDescription ? { summary: article.metaDescription } : {}),
        ...(article.featuredImageUrl ? { image: { src: article.featuredImageUrl } } : {}),
      },
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await axios.post(
          `${base}/admin/api/2024-01/blogs/${blogId}/articles.json`,
          body,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        const articleData = res.data.article;
        const link = `${siteUrl}/blogs/${blogId}/${articleData.handle}`;
        return { id: String(articleData.id), link };
      } catch (err) {
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;

        if (status === 401 || status === 403) {
          throw new Error('Shopify credentials are invalid. Please reconnect the integration.');
        }

        if (attempt === retries) {
          throw new Error(`Shopify publish failed after ${retries} attempts: ${axiosErr.message}`);
        }

        logger.warn('system', 'createArticle', `Shopify publish attempt ${attempt} failed, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    throw new Error('Shopify publish failed');
  }
}
