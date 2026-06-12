import { AppError } from './app.error';

export class BlogNotFoundError extends AppError {
  constructor() {
    super('Blog not found', 'BLOG_NOT_FOUND', 404);
  }
}

export class BlogNotEditableError extends AppError {
  constructor() {
    super('Blog can only be edited in DRAFT or CHANGES_REQUESTED status', 'BLOG_NOT_EDITABLE', 400);
  }
}

export class BlogInvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Cannot transition blog from ${from} to ${to}`, 'INVALID_BLOG_TRANSITION', 400);
  }
}

export class BlogPublishError extends AppError {
  constructor(message: string) {
    super(message, 'BLOG_PUBLISH_ERROR', 502);
  }
}
