import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

function makeBasicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

export class WordPressClient {
  static async testConnection(siteUrl: string, username: string, appPassword: string): Promise<boolean> {
    try {
      const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
      const res = await axios.get(url, {
        headers: { Authorization: makeBasicAuth(username, appPassword) },
        timeout: 10000,
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  static async uploadMedia(
    siteUrl: string,
    username: string,
    appPassword: string,
    imageUrl: string
  ): Promise<number | null> {
    try {
      const base = siteUrl.replace(/\/$/, '');
      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const contentType = imgRes.headers['content-type'] || 'image/jpeg';
      const filename = imageUrl.split('/').pop() || 'image.jpg';

      const uploadRes = await axios.post(`${base}/wp-json/wp/v2/media`, imgRes.data, {
        headers: {
          Authorization: makeBasicAuth(username, appPassword),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        timeout: 30000,
      });

      return uploadRes.data.id as number;
    } catch (err) {
      logger.warn('system', 'uploadMedia', `Failed to upload featured image: ${(err as Error).message}`);
      return null;
    }
  }

  static async createPost(
    siteUrl: string,
    username: string,
    appPassword: string,
    post: {
      title: string;
      content: string;
      slug: string;
      metaTitle?: string;
      metaDescription?: string;
      featuredMediaId?: number | null;
    },
    retries = 3
  ): Promise<{ id: string; link: string }> {
    const base = siteUrl.replace(/\/$/, '');
    const auth = makeBasicAuth(username, appPassword);

    const body: Record<string, any> = {
      title: post.title,
      content: post.content,
      slug: post.slug,
      status: 'publish',
    };

    if (post.featuredMediaId) body.featured_media = post.featuredMediaId;
    if (post.metaTitle || post.metaDescription) {
      body.meta = {
        ...(post.metaTitle ? { yoast_title: post.metaTitle } : {}),
        ...(post.metaDescription ? { yoast_description: post.metaDescription } : {}),
      };
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await axios.post(`${base}/wp-json/wp/v2/posts`, body, {
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          timeout: 30000,
        });
        return { id: String(res.data.id), link: res.data.link };
      } catch (err) {
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;

        if (status === 401 || status === 403) {
          throw new Error('WordPress credentials are invalid. Please reconnect the integration.');
        }

        if (attempt === retries) {
          throw new Error(`WordPress publish failed after ${retries} attempts: ${axiosErr.message}`);
        }

        logger.warn('system', 'createPost', `WP publish attempt ${attempt} failed, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    throw new Error('WordPress publish failed');
  }
}
