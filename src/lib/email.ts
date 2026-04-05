import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer';
import type { PlanType } from '@/types';

// ============================================================
// MUMAA Video Call Platform - Production Email Service
// ============================================================

// ---------- Types ----------

export type EmailType =
  | 'welcome'
  | 'otp'
  | 'password-reset'
  | 'call-reminder'
  | 'subscription';

export interface EmailPayload {
  to: string;
  userName: string;
  type: EmailType;
  data: Record<string, unknown>;
}

export interface WelcomeEmailData {
  dashboardUrl?: string;
}

export interface OTPEmailData {
  otp: string;
  purpose: string;
  expiryMinutes?: number;
}

export interface PasswordResetEmailData {
  resetLink: string;
  expiryMinutes?: number;
}

export interface CallReminderEmailData {
  callType: string;
  scheduledAt: string;
  nannyName?: string;
  parentName?: string;
  notes?: string;
  joinLink?: string;
}

export interface SubscriptionEmailData {
  plan: PlanType;
  planName: string;
  price: number;
  billingDate: string;
  isTrial?: boolean;
  trialEndsAt?: string;
  features: string[];
}

// ---------- In-Memory OTP Store ----------

interface OTPEntry {
  email: string;
  otp: string;
  purpose: string;
  expiresAt: number;
}

const otpStore = new Map<string, OTPEntry>();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (entry.expiresAt <= now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ---------- Email Template Helpers ----------

const BRAND_COLORS = {
  rose: '#f43f5e',
  pink: '#db2777',
  emerald: '#10b981',
  dark: '#1a1a2e',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
} as const;

function emailBaseTemplate(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${previewText}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:${BRAND_COLORS.lightGray}; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND_COLORS.lightGray};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:${BRAND_COLORS.white}; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 32px 0; background: linear-gradient(135deg, ${BRAND_COLORS.rose} 0%, ${BRAND_COLORS.pink} 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <h1 style="margin:0; font-size:28px; font-weight:800; color:${BRAND_COLORS.white}; letter-spacing:-0.5px;">MUMAA</h1>
                    <p style="margin:4px 0 0; font-size:13px; color:rgba(255,255,255,0.85); font-weight:400;">Video Call Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:40px 32px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px; border-top:1px solid ${BRAND_COLORS.lightGray}; background-color:#fafafa;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <p style="margin:0; font-size:13px; color:${BRAND_COLORS.gray}; line-height:1.6;">
                      &copy; ${new Date().getFullYear()} MUMAA. All rights reserved.<br/>
                      Connecting families with trusted nannies through video calls.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0; font-size:12px; color:#9ca3af;">
                      This email was sent by MUMAA Video Call Platform.<br/>
                      If you did not expect this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, text: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="center">
        <a href="${url}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block; padding:14px 36px; background:linear-gradient(135deg, ${BRAND_COLORS.rose} 0%, ${BRAND_COLORS.pink} 100%); color:${BRAND_COLORS.white}; text-decoration:none; font-size:15px; font-weight:600; border-radius:8px; mso-padding-alt:0; text-align:center;">
          <!--[if mso]><i style="mso-font-width:300%;mso-text-raise:21pt" hidden>&emsp;</i><![endif]-->
          <span style="mso-text-raise:10pt;">${text}</span>
          <!--[if mso]><i style="mso-font-width:300%;" hidden>&emsp;&#8203;</i><![endif]-->
        </a>
      </td>
    </tr>
  </table>`;
}

// ---------- Email Templates ----------

function welcomeTemplate(userName: string, data: WelcomeEmailData): string {
  const dashboardUrl = data.dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`;
  const content = `
  <p style="margin:0 0 8px; font-size:24px; font-weight:700; color:${BRAND_COLORS.dark};">Welcome to MUMAA! 🌸</p>
  <p style="margin:0 0 24px; font-size:15px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    Hi ${userName},<br/><br/>
    We're thrilled to have you join MUMAA — India's trusted platform for connecting parents with caring nannies through seamless video calls.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background-color:${BRAND_COLORS.lightGray}; border-radius:12px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 8px; font-size:14px; font-weight:700; color:${BRAND_COLORS.dark};">What you can do with MUMAA:</p>
        <ul style="margin:0; padding:0 0 0 20px; font-size:14px; color:${BRAND_COLORS.gray}; line-height:2;">
          <li>🎉 Schedule or start instant video calls with nannies</li>
          <li>💬 Real-time chat during video calls</li>
          <li>⭐ Rate and review your call experiences</li>
          <li>📅 Manage your calendar and call history</li>
          <li>💎 Upgrade your plan for premium features</li>
        </ul>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 8px; font-size:15px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    Get started by heading to your dashboard and exploring everything MUMAA has to offer.
  </p>
  ${ctaButton(dashboardUrl, 'Go to Dashboard')}
  <p style="margin:0; font-size:14px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    Need help? Our support team is always here for you.<br/>
    Warm regards,<br/>
    <strong style="color:${BRAND_COLORS.rose};">The MUMAA Team</strong>
  </p>`;
  return emailBaseTemplate(content, 'Welcome to MUMAA! 🌸');
}

function otpTemplate(userName: string, data: OTPEmailData): string {
  const expiryMinutes = data.expiryMinutes || 5;
  const content = `
  <p style="margin:0 0 8px; font-size:24px; font-weight:700; color:${BRAND_COLORS.dark};">Your Verification Code</p>
  <p style="margin:0 0 24px; font-size:15px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    Hi ${userName},<br/><br/>
    ${data.purpose === 'signup' ? 'To complete your signup, please verify your email address with the code below.' :
      data.purpose === 'reset-password' ? 'To reset your password, please use the verification code below.' :
      'To verify your identity, please use the code below.'}
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background:linear-gradient(135deg, ${BRAND_COLORS.lightGray} 0%, #fff5f5 100%); border-radius:12px; border:2px dashed ${BRAND_COLORS.rose};">
    <tr>
      <td align="center" style="padding:28px 20px;">
        <p style="margin:0 0 8px; font-size:13px; font-weight:600; color:${BRAND_COLORS.gray}; text-transform:uppercase; letter-spacing:1px;">Verification Code</p>
        <p style="margin:0; font-size:40px; font-weight:800; color:${BRAND_COLORS.dark}; letter-spacing:8px; font-family:'Courier New',monospace;">
          ${data.otp}
        </p>
      </td>
    </tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background-color:#fffbeb; border-radius:8px; border-left:4px solid #f59e0b;">
    <tr>
      <td style="padding:14px 20px;">
        <p style="margin:0; font-size:14px; color:#92400e; line-height:1.5;">
          ⏱️ This code expires in <strong>${expiryMinutes} minutes</strong>. Do not share it with anyone.
        </p>
      </td>
    </tr>
  </table>

  <p style="margin:0; font-size:14px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    If you didn't request this code, you can safely ignore this email.<br/>
    Best regards,<br/>
    <strong style="color:${BRAND_COLORS.rose};">The MUMAA Team</strong>
  </p>`;
  return emailBaseTemplate(content, `Your verification code: ${data.otp}`);
}

function passwordResetTemplate(userName: string, data: PasswordResetEmailData): string {
  const expiryMinutes = data.expiryMinutes || 60;
  const content = `
  <p style="margin:0 0 8px; font-size:24px; font-weight:700; color:${BRAND_COLORS.dark};">Reset Your Password</p>
  <p style="margin:0 0 24px; font-size:15px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    Hi ${userName},<br/><br/>
    We received a request to reset your MUMAA password. Click the button below to choose a new one.
  </p>

  ${ctaButton(data.resetLink, 'Reset Password')}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background-color:#fffbeb; border-radius:8px; border-left:4px solid #f59e0b;">
    <tr>
      <td style="padding:14px 20px;">
        <p style="margin:0; font-size:14px; color:#92400e; line-height:1.5;">
          ⏱️ This link expires in <strong>${expiryMinutes} minutes</strong>. After that, you'll need to request a new one.
        </p>
      </td>
    </tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background-color:${BRAND_COLORS.lightGray}; border-radius:8px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 8px; font-size:13px; font-weight:600; color:${BRAND_COLORS.gray};">If the button doesn't work, copy and paste this URL:</p>
        <p style="margin:0; font-size:12px; color:${BRAND_COLORS.rose}; word-break:break-all;">${data.resetLink}</p>
      </td>
    </tr>
  </table>

  <p style="margin:0; font-size:14px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    If you didn't request this password reset, your account is safe — you can ignore this email.<br/>
    Stay secure,<br/>
    <strong style="color:${BRAND_COLORS.rose};">The MUMAA Team</strong>
  </p>`;
  return emailBaseTemplate(content, 'Reset Your MUMAA Password');
}

function callReminderTemplate(userName: string, data: CallReminderEmailData): string {
  const joinLink = data.joinLink || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`;
  const content = `
  <p style="margin:0 0 8px; font-size:24px; font-weight:700; color:${BRAND_COLORS.dark};">Upcoming Video Call 📞</p>
  <p style="margin:0 0 24px; font-size:15px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    Hi ${userName},<br/><br/>
    This is a friendly reminder about your upcoming video call on MUMAA.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background:linear-gradient(135deg, ${BRAND_COLORS.lightGray} 0%, #ecfdf5 100%); border-radius:12px;">
    <tr>
      <td style="padding:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600; width:120px;">Call Type</td>
            <td style="padding:6px 0; font-size:14px; color:${BRAND_COLORS.dark}; font-weight:600;">
              <span style="display:inline-block; padding:3px 10px; background-color:${BRAND_COLORS.emerald}; color:white; border-radius:4px; font-size:12px; font-weight:600;">${data.callType}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600;">Scheduled For</td>
            <td style="padding:6px 0; font-size:14px; color:${BRAND_COLORS.dark}; font-weight:600;">${data.scheduledAt}</td>
          </tr>
          ${data.nannyName ? `
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600;">Nanny</td>
            <td style="padding:6px 0; font-size:14px; color:${BRAND_COLORS.dark};">${data.nannyName}</td>
          </tr>` : ''}
          ${data.parentName ? `
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600;">Parent</td>
            <td style="padding:6px 0; font-size:14px; color:${BRAND_COLORS.dark};">${data.parentName}</td>
          </tr>` : ''}
          ${data.notes ? `
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600;">Notes</td>
            <td style="padding:6px 0; font-size:14px; color:${BRAND_COLORS.dark};">${data.notes}</td>
          </tr>` : ''}
        </table>
      </td>
    </tr>
  </table>

  ${ctaButton(joinLink, 'Join Call Now')}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background-color:#eff6ff; border-radius:8px; border-left:4px solid #3b82f6;">
    <tr>
      <td style="padding:14px 20px;">
        <p style="margin:0; font-size:14px; color:#1e40af; line-height:1.5;">
          💡 <strong>Tips for a great call:</strong> Find a quiet spot, check your internet connection, and make sure your camera and microphone are working.
        </p>
      </td>
    </tr>
  </table>

  <p style="margin:0; font-size:14px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    We look forward to your call!<br/>
    Warm regards,<br/>
    <strong style="color:${BRAND_COLORS.rose};">The MUMAA Team</strong>
  </p>`;
  return emailBaseTemplate(content, `Reminder: ${data.callType} call at ${data.scheduledAt}`);
}

function subscriptionTemplate(userName: string, data: SubscriptionEmailData): string {
  const formattedPrice = `₹${data.price.toLocaleString('en-IN')}`;
  const content = `
  <p style="margin:0 0 8px; font-size:24px; font-weight:700; color:${BRAND_COLORS.dark};">Subscription Confirmed! 🎉</p>
  <p style="margin:0 0 24px; font-size:15px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    Hi ${userName},<br/><br/>
    ${data.isTrial
      ? `Great news! Your <strong>${data.planName}</strong> free trial is now active. Enjoy all premium features for ${data.trialEndsAt ? `until <strong>${data.trialEndsAt}</strong>` : 'the trial period'}!`
      : `Your <strong>${data.planName}</strong> subscription has been successfully activated.`}
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background:linear-gradient(135deg, ${BRAND_COLORS.lightGray} 0%, #fdf2f8 100%); border-radius:12px; overflow:hidden;">
    <tr>
      <td style="padding:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600; width:130px;">Plan</td>
            <td style="padding:6px 0; font-size:15px; color:${BRAND_COLORS.dark}; font-weight:700;">
              ${data.planName}
              ${data.isTrial ? '<span style="display:inline-block; padding:2px 8px; background-color:#f59e0b; color:white; border-radius:4px; font-size:11px; font-weight:600; margin-left:6px;">TRIAL</span>' : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600;">Price</td>
            <td style="padding:6px 0; font-size:15px; color:${BRAND_COLORS.dark}; font-weight:700;">${data.price === 0 ? 'Free' : `${formattedPrice}/month`}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; font-size:13px; color:${BRAND_COLORS.gray}; font-weight:600;">Billing Date</td>
            <td style="padding:6px 0; font-size:14px; color:${BRAND_COLORS.dark};">${data.billingDate}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  ${data.features.length > 0 ? `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr>
      <td style="padding-bottom:8px; font-size:14px; font-weight:700; color:${BRAND_COLORS.dark};">Your plan includes:</td>
    </tr>
    ${data.features.map((f) => `
    <tr>
      <td style="padding:4px 0; font-size:14px; color:${BRAND_COLORS.emerald};">
        <span style="color:${BRAND_COLORS.emerald}; margin-right:8px;">✓</span>
        <span style="color:${BRAND_COLORS.gray};">${f}</span>
      </td>
    </tr>`).join('')}
  </table>` : ''}

  ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`, 'Start Using MUMAA')}

  <p style="margin:0; font-size:14px; color:${BRAND_COLORS.gray}; line-height:1.7;">
    ${data.isTrial ? "You won't be charged until your trial ends. Cancel anytime from your dashboard." : 'Manage your subscription anytime from your dashboard settings.'}<br/>
    Thank you for choosing MUMAA!<br/>
    <strong style="color:${BRAND_COLORS.rose};">The MUMAA Team</strong>
  </p>`;
  return emailBaseTemplate(content, `${data.planName} Subscription Confirmed`);
}

// ---------- Email Service Class ----------

class EmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string;
  private fromName: string = 'MUMAA - Video Call Platform';
  private isConfigured: boolean = false;

  constructor() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM;

    this.fromAddress = emailFrom || 'noreply@mumaa.com';

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        // Connection pooling for production
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });
      this.isConfigured = true;
      console.log(`[EmailService] SMTP configured: ${smtpHost}:${smtpPort}`);
    } else {
      console.log('[EmailService] No SMTP configuration found — emails will be logged to console (dev mode)');
      this.isConfigured = false;
    }
  }

  /**
   * Verify SMTP transport connection
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      console.log('[EmailService] SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP verification failed:', error);
      return false;
    }
  }

  /**
   * Core send method — routes through SMTP or console
   */
  private async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const mailOptions: SendMailOptions = {
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || this.stripHtml(options.html),
    };

    // Dev mode: log to console
    if (!this.isConfigured || !this.transporter) {
      console.log('\n📧 ══════════════════════════════════════════════');
      console.log('📧 [EMAIL SERVICE — DEV MODE]');
      console.log(`📧 To: ${options.to}`);
      console.log(`📧 Subject: ${options.subject}`);
      console.log(`📧 From: "${this.fromName}" <${this.fromAddress}>`);
      console.log('📧 ──────────────────────────────────────────────');
      console.log('📧 HTML Preview:');
      console.log(options.html);
      console.log('📧 ══════════════════════════════════════════════\n');
      return { success: true, messageId: 'dev-console' };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent to ${options.to} — ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[EmailService] Failed to send email to ${options.to}:`, message);
      return { success: false, error: message };
    }
  }

  /**
   * Strip HTML tags for plain text fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ---------- Public Email Methods ----------

  async sendWelcomeEmail(to: string, userName: string, data: WelcomeEmailData = {}) {
    const html = welcomeTemplate(userName, data);
    return this.send({
      to,
      subject: 'Welcome to MUMAA! 🌸',
      html,
    });
  }

  async sendOTPEmail(to: string, userName: string, data: OTPEmailData) {
    const html = otpTemplate(userName, data);
    return this.send({
      to,
      subject: `Your Verification Code: ${data.otp}`,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, userName: string, data: PasswordResetEmailData) {
    const html = passwordResetTemplate(userName, data);
    return this.send({
      to,
      subject: 'Reset Your MUMAA Password',
      html,
    });
  }

  async sendCallReminderEmail(to: string, userName: string, data: CallReminderEmailData) {
    const html = callReminderTemplate(userName, data);
    return this.send({
      to,
      subject: `Reminder: ${data.callType} Call at ${data.scheduledAt}`,
      html,
    });
  }

  async sendSubscriptionEmail(to: string, userName: string, data: SubscriptionEmailData) {
    const html = subscriptionTemplate(userName, data);
    return this.send({
      to,
      subject: `${data.planName} Subscription Confirmed 🎉`,
      html,
    });
  }

  /**
   * Generic send — dispatches to the correct method by type
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, userName, type, data } = payload;

    switch (type) {
      case 'welcome':
        return this.sendWelcomeEmail(to, userName, data as WelcomeEmailData);
      case 'otp':
        return this.sendOTPEmail(to, userName, data as OTPEmailData);
      case 'password-reset':
        return this.sendPasswordResetEmail(to, userName, data as PasswordResetEmailData);
      case 'call-reminder':
        return this.sendCallReminderEmail(to, userName, data as CallReminderEmailData);
      case 'subscription':
        return this.sendSubscriptionEmail(to, userName, data as SubscriptionEmailData);
      default:
        return { success: false, error: `Unknown email type: ${type}` };
    }
  }

  // ---------- OTP Store Methods ----------

  /**
   * Generate a 6-digit OTP, store it in memory, and return it
   */
  generateOTP(email: string, purpose: string): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const storeKey = `${email}:${purpose}`;

    // Clean up any existing OTP for this email/purpose combo
    otpStore.delete(storeKey);

    otpStore.set(storeKey, {
      email,
      otp,
      purpose,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    return otp;
  }

  /**
   * Verify an OTP against the store
   */
  verifyOTP(email: string, otp: string, purpose: string): boolean {
    const storeKey = `${email}:${purpose}`;
    const entry = otpStore.get(storeKey);

    if (!entry) return false;

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(storeKey);
      return false;
    }

    // Check OTP match
    if (entry.otp !== otp) return false;

    // OTP used — remove from store
    otpStore.delete(storeKey);
    return true;
  }

  /**
   * Check if an OTP exists and is still valid (without consuming it)
   */
  hasActiveOTP(email: string, purpose: string): boolean {
    const storeKey = `${email}:${purpose}`;
    const entry = otpStore.get(storeKey);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(storeKey);
      return false;
    }
    return true;
  }
}

// ---------- Singleton Export ----------

export const emailService = new EmailService();

export default emailService;
