// services/emailService.js — thin wrapper around nodemailer
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = parseInt(SMTP_PORT || '587');
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    tls: { rejectUnauthorized: false },
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.warn('[emailService] SMTP not configured — skipping email to', to);
    return { success: false, reason: 'smtp_not_configured' };
  }
  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, html, text,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[emailService] send error:', err.message);
    return { success: false, reason: err.message };
  }
}
