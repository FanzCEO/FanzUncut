import { Resend } from 'resend';

// ✅ FIX: Conditionally create Resend client only if API key exists
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Email service initialized with Resend');
} else {
  console.warn('⚠️  Email service not configured (RESEND_API_KEY missing). Emails will be logged only.');
}

const FROM_EMAIL = 'BoyFanz <onboarding@resend.dev>'; // Change to your verified domain
const APP_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'http://localhost:5000';

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${APP_URL}/auth/verify-email?token=${token}`;

    // Gracefully handle when email service is not configured
    if (!resend) {
      console.warn(`⚠️  Email service not available. Would have sent verification email to ${email}`);
      console.warn(`   Verification URL: ${verificationUrl}`);
      return; // Skip sending, but don't crash the application
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 3px solid #ff0000;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
            }
            .logo .boy { color: #ff0000; }
            .logo .fanz { color: #d4a959; }
            .content {
              padding: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: #ff0000;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <span class="boy">Boy</span><span class="fanz">Fanz</span>
            </div>
          </div>
          
          <div class="content">
            <h2>Welcome to BoyFanz!</h2>
            <p>Thanks for signing up. Please verify your email address to get started.</p>
            <p>Click the button below to verify your email:</p>
            <p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
          </div>
          
          <div class="footer">
            <p>If you didn't create an account with BoyFanz, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} BoyFanz. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Verify your BoyFanz account',
        html,
      });
      console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

    // Gracefully handle when email service is not configured
    if (!resend) {
      console.warn(`⚠️  Email service not available. Would have sent password reset email to ${email}`);
      console.warn(`   Reset URL: ${resetUrl}`);
      return; // Skip sending, but don't crash the application
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 3px solid #ff0000;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
            }
            .logo .boy { color: #ff0000; }
            .logo .fanz { color: #d4a959; }
            .content {
              padding: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: #ff0000;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 6px;
              padding: 12px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <span class="boy">Boy</span><span class="fanz">Fanz</span>
            </div>
          </div>
          
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>
          </div>
          
          <div class="footer">
            <p>For security reasons, this password reset link can only be used once.</p>
            <p>&copy; ${new Date().getFullYear()} BoyFanz. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Reset your BoyFanz password',
        html,
      });
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

export const emailService = new EmailService();
