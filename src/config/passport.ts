import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
// @ts-ignore — passport-microsoft has no official @types package
import MicrosoftStrategy from 'passport-microsoft';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import prisma from './db';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────
// JWT Strategy — used by authenticateToken middleware
// ─────────────────────────────────────────────
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'fallback_secret',
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// ─────────────────────────────────────────────
// Shared find-or-create for OAuth users
// ─────────────────────────────────────────────
async function findOrCreateOAuthUser({
  provider,
  providerId,
  email,
  name,
}: {
  provider: string;
  providerId: string;
  email: string;
  name: string;
}) {
  let user = await prisma.user.findFirst({ where: { provider, providerId } });

  if (user) {
    const updateData: { name: string; email?: string } = { name };
    if (email && email !== user.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (!emailTaken) updateData.email = email;
    }
    user = await prisma.user.update({ where: { id: user.id }, data: updateData });
  }

  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { provider, providerId },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        provider,
        providerId,
        role: 'AGENCY_ADMIN',
        isActive: true,
      },
    });
    logger.success('system', 'findOrCreateOAuthUser', `New OAuth user created: ${email} via ${provider}`);
  }

  return user;
}

// ─────────────────────────────────────────────
// Google Strategy
// ─────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            provider: 'google',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName,
          });
          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

// ─────────────────────────────────────────────
// Facebook Strategy
// ─────────────────────────────────────────────
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            const err: any = new Error('Email permission was not granted. Please log in with Facebook again and allow access to your email address.');
            err.statusCode = 422;
            err.code = 'FACEBOOK_EMAIL_REQUIRED';
            return done(err, undefined);
          }
          const user = await findOrCreateOAuthUser({
            provider: 'facebook',
            providerId: profile.id,
            email,
            name: profile.displayName,
          });
          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

// ─────────────────────────────────────────────
// Microsoft Strategy
// ─────────────────────────────────────────────
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/microsoft/callback',
        tenant: process.env.MICROSOFT_TENANT_ID || 'common',
        scope: ['user.read'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: Function) => {
        try {
          const user = await findOrCreateOAuthUser({
            provider: 'microsoft',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName,
          });
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

export default passport;
