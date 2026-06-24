const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends an OTP verification email using Resend SDK.
 * @param {string} to  - Recipient email address
 * @param {string} otp - 6-digit OTP code
 */
const sendOTPEmail = async (to, otp) => {
  if (!resend) {
    console.error('❌ [Resend] Cannot send email — RESEND_API_KEY not set!');
    throw new Error('Resend API key not configured');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const subject = "🎉 You're in! Welcome to FlowGrid — your business just got a glow-up";
  const text = `Welcome to FlowGrid!\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nVerify here: ${frontendUrl}/verify-email?email=${encodeURIComponent(to)}`;
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

  console.log(`📧 [Resend] Attempting to send OTP email to ${to}...`);

  const { data, error } = await resend.emails.send({
    from: 'FlowGrid <onboarding@resend.dev>',
    to: [to],
    subject,
    text,
    html,
  });

  if (error) {
    console.error(`❌ [Resend] Email FAILED to ${to}: ${error.message}`);
    throw new Error(error.message);
  }

  console.log(`✅ [Resend] Email sent to ${to} | ID: ${data?.id}`);
  return { messageId: data?.id };
};

module.exports = { sendOTPEmail };
