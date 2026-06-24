// ─── Notification Service — Email via NodeMailer ────────────────────

const nodemailer = require('nodemailer');
const dns = require('dns');
const axios = require('axios');

// Force Node.js to prefer IPv4 over IPv6 when resolving hostnames.
// Modern Node.js versions on cloud environments (like Render/Vercel) often attempt
// to connect via IPv6 first, leading to ENETUNREACH errors.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
process.env.NODEJS_PREFER_IPV4 = '1';

// ─── SMTP Configuration ────────────────────────────────────────────

let transporter = null;
let resolvedSmtpHost = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const originalHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  let hostIp = originalHost;

  // Render/Vercel IPv6 workaround: Resolve hostname to IPv4 address to bypass ENETUNREACH
  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    try {
      const dnsPromises = require('dns').promises;
      const ipAddresses = await dnsPromises.resolve4(originalHost);
      if (ipAddresses && ipAddresses.length > 0) {
        hostIp = ipAddresses[0];
        resolvedSmtpHost = hostIp;
        console.log(`📡 [DNS] Resolved SMTP host ${originalHost} -> IPv4 ${hostIp}`);
      }
    } catch (dnsErr) {
      console.warn(`⚠️ [DNS] Failed to resolve ${originalHost} to IPv4: ${dnsErr.message}. Falling back to default hostname.`);
    }
  }

  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpConfig = {
    host: hostIp,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // TLS options for cloud platform compatibility
    tls: {
      rejectUnauthorized: false, // Allow self-signed certs on cloud platforms
      minVersion: 'TLSv1.2',
      servername: originalHost, // CRITICAL: Required for TLS verification when connecting via IP address
    },
    // Connection timeouts to prevent hanging on cloud platforms
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 15000,
    socketTimeout: 20000,
    // Enable debug logging if SMTP_DEBUG=true
    debug: process.env.SMTP_DEBUG === 'true',
    logger: process.env.SMTP_DEBUG === 'true',
  };

  // Log SMTP config at initialization (mask password)
  console.log('\n📧 [SMTP] Initializing Transporter:');
  console.log(`   Host (Original) : ${originalHost}`);
  console.log(`   Host (Resolved) : ${smtpConfig.host}`);
  console.log(`   Port            : ${smtpConfig.port}`);
  console.log(`   Secure          : ${smtpConfig.secure}`);
  console.log(`   User            : ${smtpConfig.auth.user || '⚠️  NOT SET'}`);
  console.log(`   Pass            : ${smtpConfig.auth.pass ? '****' + smtpConfig.auth.pass.slice(-4) : '⚠️  NOT SET'}`);

  transporter = nodemailer.createTransport(smtpConfig);
  return transporter;
};

const FROM_ADDRESS = `"FlowGrid 📅" <${process.env.SMTP_USER || 'your@gmail.com'}>`;

// ─── Verify Connection on Startup ──────────────────────────────

if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
  getTransporter()
    .then((t) => t.verify())
    .then(() => {
      console.log('✅ [SMTP] Connection verified — emails are ready to send!\n');
    })
    .catch((err) => {
      console.error('❌ [SMTP] Connection FAILED:', err.message);
      console.error('   Error code:', err.code || 'N/A');
      console.error('   Full error:', JSON.stringify(err, null, 2));
      console.error('   Check your SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars.');
      console.error('   For Gmail: use an App Password (not your account password).');
      console.error('   Make sure 2-Step Verification is enabled on your Google account.\n');
    });
} else {
  console.log(`\n📡 [Email] Mode active: ${process.env.RESEND_API_KEY ? 'Resend' : 'SendGrid'} API over HTTPS (bypasses Render port blocks)\n`);
}

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

  const text = `Welcome to FlowGrid!\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nVerify here: ${frontendUrl}/verify-email?email=${encodeURIComponent(to)}`;

  return sendMail(to, "🎉 You're in! Welcome to FlowGrid — your business just got a glow-up", html, text);
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

const sendMail = async (to, subject, html, text) => {
  // Option A: Resend API (HTTPS - bypasses port blocks)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`📧 [SMTP/API] Attempting to send email via Resend API to ${to}...`);
      const fromEmail = process.env.SMTP_USER || 'onboarding@resend.dev';
      const result = await axios.post('https://api.resend.com/emails', {
        from: `FlowGrid 📅 <${fromEmail}>`,
        to: [to],
        subject,
        html,
        ...(text && { text }),
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        }
      });
      console.log(`✅ [SMTP/API] Email sent via Resend API to ${to} | ID: ${result.data.id}`);
      return { messageId: result.data.id };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error(`❌ [SMTP/API] Resend API FAILED to ${to}: ${errMsg}`);
      throw new Error(`Resend API failed: ${errMsg}`);
    }
  }

  // Option B: SendGrid API (HTTPS - bypasses port blocks)
  if (process.env.SENDGRID_API_KEY) {
    try {
      console.log(`📧 [SMTP/API] Attempting to send email via SendGrid API to ${to}...`);
      const fromEmail = process.env.SMTP_USER || 'no-reply@flowgrid.com';
      const result = await axios.post('https://api.sendgrid.com/v3/mail/send', {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: 'FlowGrid 📅' },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          { type: 'text/html', value: html }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        }
      });
      console.log(`✅ [SMTP/API] Email sent via SendGrid API to ${to}`);
      return { messageId: result.headers['x-message-id'] || 'SendGrid-Success' };
    } catch (error) {
      const errMsg = JSON.stringify(error.response?.data || error.message);
      console.error(`❌ [SMTP/API] SendGrid API FAILED to ${to}: ${errMsg}`);
      throw new Error(`SendGrid API failed: ${errMsg}`);
    }
  }

  // Option C: Standard NodeMailer (SMTP)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ [SMTP] Cannot send email — SMTP_USER or SMTP_PASS not set in environment variables!');
    throw new Error('SMTP credentials not configured');
  }

  try {
    console.log(`📧 [SMTP] Attempting to send email via SMTP to ${to}...`);
    const activeTransporter = await getTransporter();
    const result = await activeTransporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      ...(text && { text }),
    });
    console.log(`✅ [SMTP] Email sent to ${to} | MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`❌ [SMTP] Email FAILED to ${to}: ${error.message}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    console.error(`   Full error:`, error);
    // Re-throw so callers know it failed
    throw error;
  }
};

const verifySMTPConnection = async () => {
  if (process.env.RESEND_API_KEY) {
    return {
      success: true,
      mode: 'Resend API',
      message: 'Resend API key detected. Emails will be sent over HTTPS (bypasses Render port blocks).',
      config: {
        host: 'api.resend.com (HTTPS)',
        port: 443,
        user: process.env.SMTP_USER || 'onboarding@resend.dev',
      }
    };
  }

  if (process.env.SENDGRID_API_KEY) {
    return {
      success: true,
      mode: 'SendGrid API',
      message: 'SendGrid API key detected. Emails will be sent over HTTPS (bypasses Render port blocks).',
      config: {
        host: 'api.sendgrid.com (HTTPS)',
        port: 443,
        user: process.env.SMTP_USER || 'no-reply@flowgrid.com',
      }
    };
  }

  try {
    const activeTransporter = await getTransporter();
    await activeTransporter.verify();
    
    const originalHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    
    return {
      success: true,
      mode: 'SMTP',
      message: 'SMTP Connection verified successfully',
      config: {
        host: originalHost,
        resolvedHost: resolvedSmtpHost || originalHost,
        port: smtpPort,
        secure: smtpPort === 465,
        user: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}...` : 'NOT_SET',
        passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
      }
    };
  } catch (error) {
    const originalHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    
    return {
      success: false,
      mode: 'SMTP',
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack,
      config: {
        host: originalHost,
        resolvedHost: resolvedSmtpHost || originalHost,
        port: smtpPort,
        secure: smtpPort === 465,
        user: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}...` : 'NOT_SET',
        passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
      }
    };
  }
};

module.exports = {
  sendOTPEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendProviderNewBooking,
  verifySMTPConnection,
};
