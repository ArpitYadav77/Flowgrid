const crypto = require('crypto');

/**
 * Generates a cryptographically random 6-digit OTP with a 30-second expiry.
 */
const generateOTP = () => ({
  code: crypto.randomInt(100000, 999999).toString(),
  expiresAt: new Date(Date.now() + 30 * 1000) // 30 seconds
});

module.exports = { generateOTP };
