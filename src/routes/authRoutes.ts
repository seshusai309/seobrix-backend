import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controller/AuthController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter, loginRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import {
  LoginSchema,
  RefreshTokenSchema,
  CheckEmailSchema,
  RegisterSchema,
  SendOtpSchema,
  VerifyOtpSchema,
  SendSmsOtpSchema,
  VerifySmsOtpSchema,
  CompletePhoneSignupSchema,
  AcceptInviteSchema,
} from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

// ─── Self-signup OTP flow ──────────────────────────────────────────────────────

/**
 * @access public
 * @route POST /register/check-email
 * @desc Check if email is available before registration
 */
router.post(
  '/register/check-email',
  rateLimiter({ max: 10 }),
  validate(CheckEmailSchema),
  authController.checkEmail.bind(authController)
);

/**
 * @access public
 * @route POST /register
 * @desc Create a new AGENCY_ADMIN account (inactive) and send OTP to email
 */
router.post(
  '/register',
  rateLimiter({ max: 15 }),
  validate(RegisterSchema),
  authController.register.bind(authController)
);

/**
 * @access public
 * @route POST /send-otp
 * @desc Resend OTP to an unverified account's email
 */
router.post(
  '/send-otp',
  rateLimiter({ max: 3 }),
  validate(SendOtpSchema),
  authController.sendOtp.bind(authController)
);

/**
 * @access public
 * @route POST /verify-otp
 * @desc Verify OTP — activates account and returns JWT token pair
 */
router.post(
  '/verify-otp',
  rateLimiter({ max: 5 }),
  validate(VerifyOtpSchema),
  authController.verifyOtp.bind(authController)
);

// ─── SMS OTP flow ─────────────────────────────────────────────────────────────

/**
 * @access public
 * @route POST /send-sms-otp
 * @desc Send a 6-digit OTP via Twilio Verify to the given phone number
 */
router.post(
  '/send-sms-otp',
  rateLimiter({ max: 3 }),
  validate(SendSmsOtpSchema),
  authController.sendSmsOtp.bind(authController)
);

/**
 * @access public
 * @route POST /verify-sms-otp
 * @desc Verify Twilio OTP — signs in (mode=signin) or returns phoneToken for profile step (mode=signup)
 */
router.post(
  '/verify-sms-otp',
  rateLimiter({ max: 5 }),
  validate(VerifySmsOtpSchema),
  authController.verifySmsOtp.bind(authController)
);

/**
 * @access public
 * @route POST /complete-phone-signup
 * @desc Finish phone signup — validates phoneToken, collects name + email, creates account
 */
router.post(
  '/complete-phone-signup',
  rateLimiter({ max: 5 }),
  validate(CompletePhoneSignupSchema),
  authController.completePhoneSignup.bind(authController)
);

// ─── Email/password login ──────────────────────────────────────────────────────

/**
 * @access public
 * @route POST /login
 * @desc Email + password login — returns accessToken, refreshToken, user
 */
router.post(
  '/login',
  loginRateLimiter,
  validate(LoginSchema),
  authController.login.bind(authController)
);

/**
 * @access public
 * @route POST /refresh
 * @desc Refresh access token using a valid refresh token (rotation — old token invalidated)
 */
router.post(
  '/refresh',
  rateLimiter({ max: 20 }),
  validate(RefreshTokenSchema),
  authController.refresh.bind(authController)
);

/**
 * @access private
 * @route POST /logout
 * @desc Revoke refresh token — invalidates session server-side
 */
router.post(
  '/logout',
  rateLimiter({ max: 10 }),
  authenticateToken,
  authController.logout.bind(authController)
);

/**
 * @access private
 * @route GET /me
 * @desc Get the currently authenticated user's profile
 */
router.get(
  '/me',
  rateLimiter({ max: 60 }),
  authenticateToken,
  authController.me.bind(authController)
);

// ─── Google OAuth ──────────────────────────────────────────────────────────────

/**
 * @access public
 * @route GET /google
 * @desc Redirect to Google OAuth consent screen
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account', session: false })
);

/**
 * @access public
 * @route GET /google/callback
 * @desc Google OAuth callback — issues JWT pair and redirects to frontend
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/v1/auth/failure', session: false }),
  authController.oauthCallback.bind(authController)
);

// ─── Facebook OAuth ────────────────────────────────────────────────────────────

/**
 * @access public
 * @route GET /facebook
 * @desc Redirect to Facebook OAuth consent screen
 */
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email', 'public_profile'], session: false })
);

/**
 * @access public
 * @route GET /facebook/callback
 * @desc Facebook OAuth callback — issues JWT pair and redirects to frontend
 */
router.get(
  '/facebook/callback',
  (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err: any, user: any) => {
      if (err) {
        const status = err.statusCode || 401;
        const code = encodeURIComponent(err.code || 'OAUTH_FAILED');
        const message = encodeURIComponent(err.message || 'OAuth authentication failed');
        return res.redirect(`/api/v1/auth/failure?status=${status}&code=${code}&message=${message}`);
      }
      if (!user) return res.redirect('/api/v1/auth/failure');
      req.user = user;
      next();
    })(req, res, next);
  },
  authController.oauthCallback.bind(authController)
);

// ─── Microsoft OAuth ───────────────────────────────────────────────────────────

/**
 * @access public
 * @route GET /microsoft
 * @desc Redirect to Microsoft OAuth consent screen
 */
router.get(
  '/microsoft',
  passport.authenticate('microsoft', { prompt: 'select_account', session: false })
);

/**
 * @access public
 * @route GET /microsoft/callback
 * @desc Microsoft OAuth callback — issues JWT pair and redirects to frontend
 */
router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/api/v1/auth/failure', session: false }),
  authController.oauthCallback.bind(authController)
);

/**
 * @access public
 * @route GET /failure
 * @desc OAuth failure fallback
 */
/**
 * @access public
 * @route GET /invite/:token
 * @desc Validate an invite token — returns email, name, role
 */
router.get(
  '/invite/:token',
  rateLimiter({ max: 10 }),
  authController.validateInvite.bind(authController)
);

/**
 * @access public
 * @route POST /accept-invite
 * @desc Accept an invite — set password, activate account, return JWT pair
 */
router.post(
  '/accept-invite',
  rateLimiter({ max: 5 }),
  validate(AcceptInviteSchema),
  authController.acceptInvite.bind(authController)
);

router.get('/failure', (req: any, res) => {
  const status = parseInt(req.query.status) || 401;
  const code = req.query.code || 'OAUTH_FAILED';
  const message = req.query.message || 'OAuth authentication failed';
  res.status(status).json({ success: false, error: { code, message } });
});

export default router;
