const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Sends an OTP verification email.
 * @param {string} to  - Recipient email address
 * @param {string} otp - 6-digit OTP code
 */
const sendOTPEmail = async (to, otp) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  await transporter.sendMail({
    from: `"FlowGrid 📅" <${process.env.SMTP_USER || 'your@gmail.com'}>`,
    to,
    subject: "🎉 You're in! Welcome to FlowGrid — your business just got a glow-up",
    html: `
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
    `
  });
};

module.exports = { sendOTPEmail };
