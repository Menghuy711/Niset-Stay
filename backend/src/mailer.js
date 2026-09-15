import nodemailer from 'nodemailer';

// Build the public reset-password URL. Defaults to the local dev frontend so
// the flow works out of the box; production deployments set PUBLIC_APP_URL.
function resetPasswordUrl(rawToken) {
  const base = (process.env.PUBLIC_APP_URL || 'http://localhost:5173/Niset-Stay').replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

const smtpConfigured = () => Boolean(process.env.MAIL_HOST && process.env.MAIL_USER);

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: ['1', 'true', 'yes'].includes((process.env.MAIL_SECURE || '').toLowerCase()),
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
    });
  }
  return transporter;
}

/**
 * Deliver a password-reset link. When SMTP is configured (MAIL_HOST/MAIL_USER)
 * the email is sent via nodemailer. Otherwise the link is printed to the server
 * log so operators can still complete resets — the flow must never silently
 * drop the token. SMTP failures also fall back to the log so a transient mail
 * outage cannot permanently strand a reset attempt.
 */
export async function sendPasswordResetEmail(email, rawToken) {
  const resetUrl = resetPasswordUrl(rawToken);
  const subject = 'Your Niset Stay password reset link';
  const text = `Someone requested a password reset for ${email}.\n\n` +
    `If this was you, open the link below within 15 minutes:\n${resetUrl}\n\n` +
    `If you didn't request this, you can safely ignore this email.`;

  if (!smtpConfigured()) {
    console.log(`[MAIL] No SMTP transport configured (set MAIL_HOST/MAIL_USER). Password reset link for ${email}:\n${resetUrl}`);
    return { transport: 'log' };
  }

  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: email,
      subject,
      text,
    });
    return { transport: 'smtp' };
  } catch (err) {
    console.error(`[MAIL] SMTP delivery to ${email} failed, falling back to log:`, err.message);
    console.log(`[MAIL] Password reset link for ${email}:\n${resetUrl}`);
    return { transport: 'log' };
  }
}