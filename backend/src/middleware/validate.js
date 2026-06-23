// ─── Request Validation Middleware ───────────────────────────────────

const { AppError } = require('./errorHandler');

/**
 * Validate required fields in req.body.
 * @param {string[]} fields - List of required field names
 */
const validateRequired = (...fields) => {
  return (req, res, next) => {
    const missing = fields.filter((f) => {
      const val = req.body[f];
      return val === undefined || val === null || val === '';
    });

    if (missing.length > 0) {
      return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
    }
    next();
  };
};

/**
 * Validate email format.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (req, res, next) => {
  if (req.body.email && !EMAIL_REGEX.test(req.body.email)) {
    return next(new AppError('Invalid email format', 400));
  }
  next();
};

/**
 * Validate strong password.
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const validatePassword = (req, res, next) => {
  if (req.body.password && !PASSWORD_REGEX.test(req.body.password)) {
    return next(
      new AppError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        400
      )
    );
  }
  next();
};

module.exports = { validateRequired, validateEmail, validatePassword };
