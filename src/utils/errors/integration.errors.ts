import { AppError } from './app.error';

export class IntegrationNotFoundError extends AppError {
  constructor() {
    super('Integration not found', 'INTEGRATION_NOT_FOUND', 404);
  }
}

export class IntegrationConnectionError extends AppError {
  constructor(message: string) {
    super(message, 'INTEGRATION_CONNECTION_ERROR', 502);
  }
}

export class IntegrationBrokenError extends AppError {
  constructor(type: string) {
    super(
      `${type} integration credentials are invalid. Please reconnect.`,
      'INTEGRATION_BROKEN',
      502
    );
  }
}
