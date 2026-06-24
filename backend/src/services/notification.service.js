// ─── Notification Service — Email via NodeMailer ────────────────────

const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = `"FlowGrid 📅" <${process.env.SMTP_USER || 'your@gmail.com'}>`;

// ─── Email Templates ────────────────────────────────────────────────

const wrapHtml = (body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f6f9; }
    .container { max-width: 520px; margin: 32px auto; background: #fff; border-radius: 12px;
                 box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1d4ed8, #3b82f6); padding: 24px 32px; color: white; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 28px 32px; color: #374151; line-height: 1.6; }
    .highlight { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center;
                 padding: 20px; background: #f3f4f6; border-radius: 8px; color: #111827; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .info-label { color: #6b7280; font-size: 13px; }
    .info-value { color: #111827; font-weight: 600; font-size: 14px; }
    .footer { padding: 16px 32px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 28px; background: #1d4ed8; color: white;
           text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${body}
    <div class="footer">
      &copy; ${new Date().getFullYear()} FlowGrid. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

// ─── Send Functions ─────────────────────────────────────────────────

/**
 * Send OTP verification email.
 */
const sendOTPEmail = async (to, otp) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const html = `
    <div style="background:#0d2b2b; color:#fff; font-family:sans-serif; padding:40px; border-radius:12px; max-width: 520px; margin: 32px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
      <h1 style="color:#c9a84c; margin-top:0;">Welcome to FlowGrid 🎉</h1>
      <p>Your chaotic booking days are <strong>officially OVER.</strong></p>
      <p>
        📅 <b>Real-time Booking</b> — No double bookings. Ever.<br/>
        🔒 <b>Secure Payments</b> — Powered by Razorpay.<br/>
        📊 <b>Business Analytics</b> — Watch your revenue grow.
      </p>
      
      <div style="background: #113f3f; border: 1px solid #c9a84c; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #a1b8b8; display: block; margin-bottom: 8px;">Your Verification Code</span>
        <div style="font-size: 36px; font-weight: bold; color: #c9a84c; letter-spacing: 8px; margin-left: 8px;">${otp}</div>
      </div>

      <a href="${frontendUrl}/verify-email?email=${encodeURIComponent(to)}" style="background:#c9a84c; color:#000; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
        Verify My Email →
      </a>
      <p style="margin-top:24px; font-size:12px; color:#a1b8b8;">The code is valid for 5 minutes. Don't ghost it! 😄</p>
    </div>
  `;

  return sendMail(to, "🎉 You're in! Welcome to FlowGrid — your business just got a glow-up", html);
};

/**
 * Send booking confirmation email.
 */
const sendBookingConfirmation = async (to, booking) => {
  const html = wrapHtml(`
    <div class="header"><h1>Booking Confirmed! ✓</h1></div>
    <div class="body">
      <p>Great news! Your booking has been confirmed.</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div class="info-row">
          <span class="info-label">Service</span>
          <span class="info-value">${booking.serviceName || booking.service?.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time</span>
          <span class="info-value">${booking.startTime} – ${booking.endTime}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount</span>
          <span class="info-value">₹${booking.price}</span>
        </div>
        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Booking ID</span>
          <span class="info-value">${booking.id}</span>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Please arrive on time. You can cancel up to 2 hours before the appointment.</p>
    </div>
  `);

  return sendMail(to, `Booking Confirmed — ${booking.serviceName || booking.service?.name || ''}`, html);
};

/**
 * Send booking cancellation email.
 */
const sendBookingCancellation = async (to, booking, reason) => {
  const html = wrapHtml(`
    <div class="header" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
      <h1>Booking Cancelled</h1>
    </div>
    <div class="body">
      <p>Your booking has been cancelled.</p>
      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div class="info-row">
          <span class="info-label">Service</span>
          <span class="info-value">${booking.serviceName || booking.service?.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${new Date(booking.date).toLocaleDateString('en-IN')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Booking ID</span>
          <span class="info-value">${booking.id}</span>
        </div>
        ${reason ? `<div class="info-row" style="border-bottom: none;">
          <span class="info-label">Reason</span>
          <span class="info-value">${reason}</span>
        </div>` : ''}
      </div>
      <p style="color: #6b7280; font-size: 13px;">If a refund is applicable, it will be processed within 5-7 business days.</p>
    </div>
  `);

  return sendMail(to, `Booking Cancelled — ${booking.id}`, html);
};

/**
 * Send email to provider about new booking.
 */
const sendProviderNewBooking = async (to, booking, customerName) => {
  const html = wrapHtml(`
    <div class="header" style="background: linear-gradient(135deg, #059669, #10b981);">
      <h1>New Booking Received! 🎉</h1>
    </div>
    <div class="body">
      <p>You have a new booking from <strong>${customerName}</strong>.</p>
      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div class="info-row">
          <span class="info-label">Service</span>
          <span class="info-value">${booking.serviceName || booking.service?.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time</span>
          <span class="info-value">${booking.startTime} – ${booking.endTime}</span>
        </div>
        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Amount</span>
          <span class="info-value">₹${booking.price}</span>
        </div>
      </div>
    </div>
  `);

  return sendMail(to, `New Booking — ${customerName}`, html);
};

// ─── Core Send Function ─────────────────────────────────────────────

const sendMail = async (to, subject, html) => {
  try {
    const result = await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return result;
  } catch (error) {
    console.warn(`📧 Email delivery failed to ${to}: ${error.message}`);
    console.warn('   Configure SMTP_HOST/SMTP_USER/SMTP_PASS in .env to enable email delivery.');
    // Don't throw — email failures shouldn't break the flow
  }
};

module.exports = {
  sendOTPEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendProviderNewBooking,
};
