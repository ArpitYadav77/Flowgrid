// ─── Role-Based Access Control Middleware ───────────────────────────

/**
 * Middleware to restrict route access to specific roles.
 * Usage: roleGuard('ADMIN', 'PROVIDER')
 */
const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Middleware to ensure the user is the resource owner or an admin.
 * Expects the user ID param name as argument.
 * Usage: ownerOrAdmin('userId')
 */
const ownerOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const resourceOwnerId = req.params[paramName] || req.body[paramName];

    if (req.user.role === 'ADMIN' || req.user.id === resourceOwnerId) {
      return next();
    }

    return res.status(403).json({ error: 'Not authorized to access this resource' });
  };
};

module.exports = { roleGuard, ownerOrAdmin };
