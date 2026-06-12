import nodemailer from "nodemailer";
import { logger } from "./logger";

const BRAND_GREEN = "#27a06a";
const BRAND_GREEN_BORDER = "#c6eed9";
const BRAND_DARK = "#0a0a0c";
const BRAND_SURFACE = "#161619";

// ─────────────────────────────────────────────
// Base layout
// ─────────────────────────────────────────────
function baseTemplate(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SEO Brix</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

          <!-- HEADER -->
          <tr>
            <td align="center"
                style="background:${BRAND_DARK};border-radius:14px 14px 0 0;padding:28px 40px;">
              <p style="margin:0 0 4px 0;font-size:24px;font-weight:900;color:${BRAND_GREEN};
                         letter-spacing:1px;font-family:Arial,sans-serif;">SEO Brix</p>
              <p style="margin:0;color:#666;font-size:11px;letter-spacing:2px;
                        text-transform:uppercase;">Agency SEO Platform</p>
            </td>
          </tr>

          <!-- GREEN DIVIDER -->
          <tr>
            <td style="background:${BRAND_DARK};padding:0 40px;">
              <div style="height:2px;background:linear-gradient(90deg,${BRAND_GREEN} 0%,#6ee7b7 50%,${BRAND_GREEN_BORDER} 100%);
                          border-radius:2px;"></div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px 40px 40px;
                       border-left:1px solid ${BRAND_GREEN_BORDER};
                       border-right:1px solid ${BRAND_GREEN_BORDER};">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center"
                style="background:${BRAND_DARK};border-radius:0 0 14px 14px;padding:24px 40px;">
              <p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;
                        color:${BRAND_GREEN};letter-spacing:1px;">SEO Brix</p>
              <div style="height:1px;background:rgba(39,160,106,0.25);margin:12px 0;"></div>
              <p style="margin:0;color:#555;font-size:11px;line-height:1.8;">
                &copy; ${year} SEO Brix &middot; All rights reserved<br/>
                This is an automated message &mdash; please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Reusable blocks
// ─────────────────────────────────────────────
function infoBox(content: string, color = BRAND_GREEN): string {
  return `<div style="background:#f8fffe;border-left:4px solid ${color};
    border-radius:6px;padding:20px 24px;margin:24px 0;
    border:1px solid ${BRAND_GREEN_BORDER};border-left:4px solid ${color};">${content}</div>`;
}

function ctaButton(label: string, href: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="background:${BRAND_GREEN};color:#ffffff;text-decoration:none;
      padding:14px 40px;border-radius:8px;font-size:15px;display:inline-block;
      font-weight:bold;letter-spacing:0.5px;">${label}</a>
  </div>`;
}

function bodyText(text: string): string {
  return `<p style="color:#444;font-size:15px;line-height:1.8;margin:0 0 16px 0;">${text}</p>`;
}

function heading(text: string, color = BRAND_DARK): string {
  return `<h2 style="color:${color};margin:0 0 20px 0;font-size:22px;font-weight:bold;">${text}</h2>`;
}

function blogCard(title: string, client: string, status: string, statusColor = BRAND_GREEN): string {
  return `<div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:20px 0;
    border:1px solid #e9ecef;">
    <p style="margin:0 0 6px 0;font-size:16px;font-weight:bold;color:#1a1a2e;">${title}</p>
    <p style="margin:0 0 4px 0;font-size:13px;color:#666;">Client: <strong>${client}</strong></p>
    <p style="margin:0;font-size:12px;font-weight:bold;text-transform:uppercase;
       letter-spacing:1px;color:${statusColor};">${status}</p>
  </div>`;
}

// ─────────────────────────────────────────────
// EmailService
// ─────────────────────────────────────────────
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      logger.warn(
        "system",
        "EmailService",
        "SMTP_USER or SMTP_PASS not set — email sending disabled."
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  private get senderAddress(): string {
    return `"SEO Brix" <${process.env.SMTP_USER}>`;
  }

  private async send(
    to: string | string[],
    subject: string,
    html: string
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.warn("system", "EmailService.send", "Email not sent — transporter not configured.");
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.senderAddress,
        to: Array.isArray(to) ? to.join(",") : to,
        subject,
        html,
      });
      return true;
    } catch (error: any) {
      logger.error("system", "EmailService.send", error.message);
      return false;
    }
  }

  // ── OTP Verification ─────────────────────────────────────────────────────
  async sendOTP(email: string, otp: string): Promise<boolean> {
    const html = baseTemplate(`
      ${heading("Verify Your Email Address")}
      ${bodyText("Use the code below to verify your email and activate your SEO Brix account. This code expires in <strong>5 minutes</strong>.")}
      ${infoBox(`
        <p style="text-align:center;margin:0;font-size:44px;font-weight:900;
          letter-spacing:14px;color:${BRAND_GREEN};font-family:monospace;">${otp}</p>
      `)}
      ${bodyText("If you didn't request this, you can safely ignore this email — no account will be activated.")}
    `);
    const ok = await this.send(email, "Your SEO Brix verification code", html);
    if (ok) logger.success("system", "sendOTP", `OTP sent to ${email}`);
    else logger.error("system", "sendOTP", `Failed for ${email}`);
    return ok;
  }

  // ── Invite Link ───────────────────────────────────────────────────────────
  async sendInviteEmail(
    email: string,
    name: string,
    role: string,
    inviteLink: string
  ): Promise<boolean> {
    const roleLabel = role.replace(/_/g, ' ');
    const html = baseTemplate(`
      ${heading(`You've been invited to SEO Brix`)}
      ${bodyText(`Hi <strong>${name}</strong>, you've been invited to join SEO Brix as a <strong>${roleLabel}</strong>.`)}
      ${bodyText(`Click the button below to set your password and activate your account. This link expires in <strong>24 hours</strong>.`)}
      ${ctaButton('Accept Invitation', inviteLink)}
      ${infoBox(`
        <p style="margin:0 0 6px 0;font-size:14px;color:#555;"><strong>Email:</strong> ${email}</p>
        <p style="margin:0;font-size:14px;color:#555;"><strong>Role:</strong> ${roleLabel}</p>
      `)}
      ${bodyText('If you did not expect this invitation, you can safely ignore this email.')}
    `);
    const ok = await this.send(email, "You're invited to SEO Brix", html);
    if (ok) logger.success('system', 'sendInviteEmail', `Invite sent to ${email}`);
    else logger.error('system', 'sendInviteEmail', `Failed for ${email}`);
    return ok;
  }

  // ── Welcome / Invite ──────────────────────────────────────────────────────
  async sendWelcomeEmail(
    email: string,
    name: string,
    tempPassword: string,
    role: string
  ): Promise<boolean> {
    const html = baseTemplate(`
      ${heading(`Welcome to SEO Brix, ${name}! 🎉`)}
      ${bodyText("You've been added to your team's SEO Brix workspace. Here are your login details:")}
      ${infoBox(`
        <p style="margin:0 0 8px 0;font-size:14px;color:#555;"><strong>Email:</strong> ${email}</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#555;"><strong>Role:</strong> ${role.replace(/_/g, " ")}</p>
        <p style="margin:0;font-size:14px;color:#555;"><strong>Temporary Password:</strong>
          <span style="font-family:monospace;font-size:15px;color:#1a1a2e;letter-spacing:1px;">${tempPassword}</span>
        </p>
      `)}
      ${bodyText("Please log in and change your password as soon as possible.")}
      ${infoBox(`
        <ul style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:2.2;">
          <li>Log in with the credentials above</li>
          <li>Go to <strong>Settings → Profile</strong> to update your password</li>
          <li>You can also sign in with Google, Microsoft, or Facebook</li>
        </ul>
      `)}
    `);
    const ok = await this.send(email, "You're invited to SEO Brix", html);
    if (ok) logger.success("system", "sendWelcomeEmail", `Welcome email sent to ${email}`);
    else logger.error("system", "sendWelcomeEmail", `Failed for ${email}`);
    return ok;
  }

  // ── Blog Submitted for Review ─────────────────────────────────────────────
  async sendBlogSubmittedNotification(
    reviewerEmail: string,
    reviewerName: string,
    blogTitle: string,
    clientName: string,
    authorName: string
  ): Promise<boolean> {
    const html = baseTemplate(`
      ${heading("Blog Submitted for Review 📝")}
      ${bodyText(`Hi <strong>${reviewerName}</strong>, a new blog post has been submitted and is waiting for your review.`)}
      ${blogCard(blogTitle, clientName, "IN REVIEW", "#d97706")}
      ${infoBox(`
        <p style="margin:0 0 6px 0;font-size:14px;color:#555;"><strong>Author:</strong> ${authorName}</p>
        <p style="margin:0;font-size:14px;color:#555;"><strong>Client:</strong> ${clientName}</p>
      `, "#d97706")}
      ${bodyText("Please log in to review the post and approve, request changes, or reject it.")}
    `);
    const ok = await this.send(reviewerEmail, `New Blog for Review: ${blogTitle}`, html);
    if (ok) logger.success("system", "sendBlogSubmittedNotification", `Sent to ${reviewerEmail}`);
    else logger.error("system", "sendBlogSubmittedNotification", `Failed for ${reviewerEmail}`);
    return ok;
  }

  // ── Blog Approved ─────────────────────────────────────────────────────────
  async sendBlogApproved(
    authorEmail: string,
    authorName: string,
    blogTitle: string,
    clientName: string
  ): Promise<boolean> {
    const html = baseTemplate(`
      ${heading("Blog Post Approved! ✅", BRAND_GREEN)}
      ${bodyText(`Great news, <strong>${authorName}</strong>! Your blog post has been approved and is ready to publish.`)}
      ${blogCard(blogTitle, clientName, "APPROVED", BRAND_GREEN)}
      ${bodyText("The agency admin or manager will now schedule publishing to the client's website.")}
    `);
    const ok = await this.send(authorEmail, `Approved: ${blogTitle}`, html);
    if (ok) logger.success("system", "sendBlogApproved", `Sent to ${authorEmail}`);
    else logger.error("system", "sendBlogApproved", `Failed for ${authorEmail}`);
    return ok;
  }

  // ── Changes Requested ─────────────────────────────────────────────────────
  async sendBlogChangesRequested(
    authorEmail: string,
    authorName: string,
    blogTitle: string,
    clientName: string,
    reviewerName: string,
    note?: string
  ): Promise<boolean> {
    const html = baseTemplate(`
      ${heading("Changes Requested on Your Blog Post")}
      ${bodyText(`Hi <strong>${authorName}</strong>, <strong>${reviewerName}</strong> has reviewed your blog post and requested some changes before it can be approved.`)}
      ${blogCard(blogTitle, clientName, "CHANGES REQUESTED", "#f97316")}
      ${note ? infoBox(`
        <p style="margin:0 0 6px 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Reviewer's Feedback</p>
        <p style="margin:0;font-size:14px;color:#444;line-height:1.7;font-style:italic;">"${note}"</p>
      `, "#f97316") : ""}
      ${bodyText("Please make the requested changes and resubmit the post for review.")}
    `);
    const ok = await this.send(authorEmail, `Changes Requested: ${blogTitle}`, html);
    if (ok) logger.success("system", "sendBlogChangesRequested", `Sent to ${authorEmail}`);
    else logger.error("system", "sendBlogChangesRequested", `Failed for ${authorEmail}`);
    return ok;
  }

  // ── Blog Rejected ─────────────────────────────────────────────────────────
  async sendBlogRejected(
    authorEmail: string,
    authorName: string,
    blogTitle: string,
    clientName: string,
    reviewerName: string,
    note?: string
  ): Promise<boolean> {
    const html = baseTemplate(`
      ${heading("Blog Post Not Approved", "#ef4444")}
      ${bodyText(`Hi <strong>${authorName}</strong>, unfortunately your blog post has been rejected by <strong>${reviewerName}</strong>.`)}
      ${blogCard(blogTitle, clientName, "REJECTED", "#ef4444")}
      ${note ? infoBox(`
        <p style="margin:0 0 6px 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Reason</p>
        <p style="margin:0;font-size:14px;color:#444;line-height:1.7;">"${note}"</p>
      `, "#ef4444") : ""}
      ${bodyText("Please contact your manager if you have questions about this decision.")}
    `);
    const ok = await this.send(authorEmail, `Rejected: ${blogTitle}`, html);
    if (ok) logger.success("system", "sendBlogRejected", `Sent to ${authorEmail}`);
    else logger.error("system", "sendBlogRejected", `Failed for ${authorEmail}`);
    return ok;
  }

  // ── Blog Published ────────────────────────────────────────────────────────
  async sendBlogPublished(
    emails: string[],
    blogTitle: string,
    clientName: string,
    liveUrl: string
  ): Promise<boolean> {
    const html = baseTemplate(`
      ${heading("Blog Post is Live! 🚀", BRAND_GREEN)}
      ${bodyText(`The following blog post has been successfully published to <strong>${clientName}</strong>'s website.`)}
      ${blogCard(blogTitle, clientName, "PUBLISHED", BRAND_GREEN)}
      ${ctaButton("View Live Post", liveUrl)}
      ${infoBox(`
        <p style="margin:0;font-size:14px;color:#555;">Live URL:<br/>
          <a href="${liveUrl}" style="color:${BRAND_GREEN};word-break:break-all;">${liveUrl}</a>
        </p>
      `)}
    `);
    const ok = await this.send(emails, `Published: ${blogTitle}`, html);
    if (ok) logger.success("system", "sendBlogPublished", `Sent to ${emails.join(", ")}`);
    else logger.error("system", "sendBlogPublished", `Failed`);
    return ok;
  }
}

export const emailService = new EmailService();
