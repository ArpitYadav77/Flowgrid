const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // SSL
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
  await transporter.sendMail({
    from: `"FlowGrid" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your FlowGrid Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #374151;">Use the code below to activate your FlowGrid account. It expires in <strong>30 seconds</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; text-align: center; padding: 24px; background: #f3f4f6; border-radius: 8px; color: #111827; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 13px;">If you didn't create a FlowGrid account, you can safely ignore this email.</p>
      </div>
    `
  });
};

module.exports = { sendOTPEmail };
