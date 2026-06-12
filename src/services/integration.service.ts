import { CmsType, IntegrationStatus } from '@prisma/client';
import { IntegrationRepository } from '../repository/IntegrationRepository';
import { encrypt } from '../utils/crypto';
import { WordPressClient } from '../integrations/wordpress.client';
import { ShopifyClient } from '../integrations/shopify.client';
import { IntegrationConnectionError, IntegrationNotFoundError } from '../utils/errors/integration.errors';
import { AppError } from '../utils/errors/app.error';
import { logger } from '../utils/logger';
import { ConnectWordPressInput, ConnectShopifyInput } from '../validators/integration.validator';

const integrationRepo = new IntegrationRepository();

export class IntegrationService {
  async connectWordPress(projectId: string, input: ConnectWordPressInput) {
    const ok = await WordPressClient.testConnection(input.siteUrl, input.username, input.applicationPassword);
    if (!ok) throw new IntegrationConnectionError('Could not connect to WordPress. Check your site URL and application password.');

    const tokenEncrypted = encrypt(input.applicationPassword);
    const integration = await integrationRepo.create({
      type: CmsType.WORDPRESS,
      siteUrl: input.siteUrl,
      username: input.username,
      tokenEncrypted,
      status: IntegrationStatus.CONNECTED,
      lastTestedAt: new Date(),
      project: { connect: { id: projectId } },
    });

    logger.success('system', 'connectWordPress', `WordPress connected for project ${projectId}`);
    return this.safeIntegration(integration);
  }

  async connectShopify(projectId: string, input: ConnectShopifyInput) {
    const ok = await ShopifyClient.testConnection(input.siteUrl, input.accessToken);
    if (!ok) throw new IntegrationConnectionError('Could not connect to Shopify. Check your store URL and access token.');

    const tokenEncrypted = encrypt(input.accessToken);
    const integration = await integrationRepo.create({
      type: CmsType.SHOPIFY,
      siteUrl: input.siteUrl,
      tokenEncrypted,
      status: IntegrationStatus.CONNECTED,
      lastTestedAt: new Date(),
      project: { connect: { id: projectId } },
    });

    logger.success('system', 'connectShopify', `Shopify connected for project ${projectId}`);
    return this.safeIntegration(integration);
  }

  async test(id: string) {
    const integration = await integrationRepo.findById(id);
    if (!integration) throw new IntegrationNotFoundError();

    let ok = false;
    const { decrypt } = await import('../utils/crypto');
    const token = decrypt(integration.tokenEncrypted);

    if (integration.type === CmsType.WORDPRESS) {
      ok = await WordPressClient.testConnection(integration.siteUrl, integration.username || '', token);
    } else {
      ok = await ShopifyClient.testConnection(integration.siteUrl, token);
    }

    const status = ok ? IntegrationStatus.CONNECTED : IntegrationStatus.BROKEN;
    const updated = await integrationRepo.setStatus(id, status);
    return this.safeIntegration(updated);
  }

  async listByProject(projectId: string) {
    const list = await integrationRepo.findByProject(projectId);
    return list.map((i) => this.safeIntegration(i));
  }

  async delete(id: string) {
    const integration = await integrationRepo.findById(id);
    if (!integration) throw new IntegrationNotFoundError();
    await integrationRepo.delete(id);
  }

  private safeIntegration(integration: any) {
    const { tokenEncrypted: _t, ...safe } = integration;
    return safe;
  }
}
