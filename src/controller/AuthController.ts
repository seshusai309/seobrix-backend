import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors/app.error';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      await authService.logout(req.user!.id);
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    const { passwordHash: _ph, refreshTokenHash: _rt, ...safe } = req.user!;
    res.status(200).json({ success: true, data: safe });
  }

  async checkEmail(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.checkEmail(req.body.email);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.sendOtp(req.body.email);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.verifyOtp(req.body.email, req.body.otp);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async sendSmsOtp(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.sendSmsOtp(req.body.phone);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async verifySmsOtp(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.verifySmsOtp(req.body.phone, req.body.code);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async validateInvite(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.validateInvite(req.params.token);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async acceptInvite(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.acceptInvite(req.body.token, req.body.password);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  async completePhoneSignup(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.completePhoneSignup(
        req.body.phoneToken,
        req.body.name,
        req.body.email,
        req.body.agencyName
      );
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
    }
  }

  // OAuth callback — issues JWT pair and redirects to frontend
  async oauthCallback(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.issueTokens(req.user!);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`
      );
    } catch (err: any) {
      logger.error(req.user?.id || 'anonymous', 'oauthCallback', err.message);
      res.status(500).json({ success: false, error: { code: 'OAUTH_ERROR', message: 'OAuth login failed' } });
    }
  }
}
