import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── Transporter ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ─── HTML base template ───────────────────────────────────────────────────────
function baseTemplate(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
.container{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center}
.header h1{color:#fff;margin:0;font-size:24px}
.body{padding:30px;color:#333;line-height:1.6}
.btn{display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;margin:20px 0;font-weight:bold}
.footer{background:#f9f9f9;padding:20px;text-align:center;color:#999;font-size:12px}
</style></head><body>
<div class="container">
<div class="header"><h1>LMS CourseMate</h1></div>
<div class="body">${content}</div>
<div class="footer">© ${new Date().getFullYear()} LMS CourseMate. All rights reserved.</div>
</div></body></html>`;
}

// ─── Email Service ────────────────────────────────────────────────────────────
export const EmailService = {

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${env.FRONTEND_URL}/verify-email/${token}`;
    await transporter.sendMail({
      from: env.EMAIL_FROM, to,
      subject: 'Verify your email — LMS CourseMate',
      html: baseTemplate(`<h2>Welcome, ${name}!</h2><p>Please verify your email address to get started.</p><a href="${url}" class="btn">Verify Email</a><p>This link expires in 24 hours.</p>`),
    });
    logger.info(`[email] Verification email sent to ${to}`);
  },

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${env.FRONTEND_URL}/reset-password/${token}`;
    await transporter.sendMail({
      from: env.EMAIL_FROM, to,
      subject: 'Reset your password — LMS CourseMate',
      html: baseTemplate(`<h2>Hi ${name},</h2><p>We received a request to reset your password.</p><a href="${url}" class="btn">Reset Password</a><p>This link expires in 1 hour.</p>`),
    });
    logger.info(`[email] Password reset email sent to ${to}`);
  },

  async sendEnrollmentConfirmation(to: string, name: string, courseName: string): Promise<void> {
    await transporter.sendMail({
      from: env.EMAIL_FROM, to,
      subject: `You're enrolled in ${courseName} — LMS CourseMate`,
      html: baseTemplate(`<h2>Enrollment Confirmed!</h2><p>Hi ${name}, you've successfully enrolled in <strong>${courseName}</strong>.</p><a href="${env.FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>`),
    });
    logger.info(`[email] Enrollment confirmation sent to ${to}`);
  },

  async sendCertificateEmail(to: string, name: string, courseName: string, pdfUrl: string): Promise<void> {
    await transporter.sendMail({
      from: env.EMAIL_FROM, to,
      subject: `Your certificate for ${courseName} is ready!`,
      html: baseTemplate(`<h2>Congratulations, ${name}!</h2><p>You've completed <strong>${courseName}</strong> and earned your certificate.</p><a href="${pdfUrl}" class="btn">Download Certificate</a>`),
    });
    logger.info(`[email] Certificate email sent to ${to}`);
  },

  async sendAssignmentGradedEmail(to: string, name: string, assignmentTitle: string, score: number, maxMarks: number): Promise<void> {
    await transporter.sendMail({
      from: env.EMAIL_FROM, to,
      subject: `Your assignment has been graded — ${assignmentTitle}`,
      html: baseTemplate(`<h2>Assignment Graded</h2><p>Hi ${name}, your submission for <strong>${assignmentTitle}</strong> has been graded.</p><p><strong>Score: ${score} / ${maxMarks}</strong></p><a href="${env.FRONTEND_URL}/dashboard" class="btn">View Feedback</a>`),
    });
    logger.info(`[email] Assignment graded email sent to ${to}`);
  },

  async sendDeadlineReminder(to: string, name: string, assignmentTitle: string, dueDate: Date): Promise<void> {
    const dueDateStr = dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    await transporter.sendMail({
      from: env.EMAIL_FROM, to,
      subject: `Reminder: "${assignmentTitle}" is due soon`,
      html: baseTemplate(`<h2>Assignment Due Soon</h2><p>Hi ${name}, this is a reminder that <strong>${assignmentTitle}</strong> is due on <strong>${dueDateStr}</strong>.</p><a href="${env.FRONTEND_URL}/dashboard" class="btn">Submit Now</a>`),
    });
    logger.info(`[email] Deadline reminder sent to ${to}`);
  },
};

// ─── Named exports for backward compatibility with auth.service ───────────────
export const sendVerificationEmail = (to: string, name: string, token: string) =>
  EmailService.sendVerificationEmail(to, name, token);

export const sendPasswordResetEmail = (to: string, name: string, token: string) =>
  EmailService.sendPasswordResetEmail(to, name, token);
