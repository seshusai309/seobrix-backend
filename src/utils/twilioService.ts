import twilio from 'twilio';
import { logger } from './logger';

class TwilioService {
  private client: twilio.Twilio | null = null;
  private serviceSid: string | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      logger.warn('system', 'TwilioService', 'Twilio credentials not set — SMS disabled');
      return;
    }

    this.client = twilio(accountSid, authToken);
    this.serviceSid = serviceSid;
  }

  get isEnabled(): boolean {
    return !!(this.client && this.serviceSid);
  }

  async sendOTP(phone: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.client || !this.serviceSid) {
      return { ok: false, error: 'SMS service not configured' };
    }
    try {
      const v = await this.client.verify.v2
        .services(this.serviceSid)
        .verifications.create({ to: phone, channel: 'sms' });
      logger.success('system', 'sendSmsOTP', `OTP sent to ${phone}: ${v.status}`);
      return { ok: v.status === 'pending' };
    } catch (err: any) {
      logger.error('system', 'sendSmsOTP', err.message);
      const msg = err.message?.includes('unverified')
        ? 'This number is not verified in our SMS trial account. Please use a verified number.'
        : err.message || 'Failed to send SMS';
      return { ok: false, error: msg };
    }
  }

  async verifyOTP(phone: string, code: string): Promise<{ approved: boolean; error?: string }> {
    if (!this.client || !this.serviceSid) {
      return { approved: false, error: 'SMS service not configured' };
    }
    try {
      const check = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({ to: phone, code });
      if (check.status === 'approved') {
        return { approved: true };
      }
      // status === 'pending' means wrong code but verification still alive
      return { approved: false, error: 'Incorrect OTP. Please check and try again.' };
    } catch (err: any) {
      logger.error('system', 'verifySmsOTP', `${err.status} — ${err.message}`);
      // Twilio 404: verification expired, already used, or phone mismatch
      if (err.status === 404 || err.code === 20404) {
        return {
          approved: false,
          error: 'OTP expired or already used. Please tap "Resend OTP" to get a new one.',
        };
      }
      return { approved: false, error: 'Verification failed. Please try again.' };
    }
  }
}

export const twilioService = new TwilioService();
