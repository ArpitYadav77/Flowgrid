// ─── Auth Controller ────────────────────────────────────────────────

const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateAccessToken, generateRefreshToken, revokeAllTokens } = require('../middleware/auth');
const { sendOTPEmail } = require('../services/notification.service');
const { AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

const ROLES = ['CUSTOMER', 'PROVIDER', 'ADMIN'];

const generateOTP = () => ({
  code: crypto.randomInt(100000, 999999).toString(),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
});

// POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password, role = 'CUSTOMER', businessName, category, latitude, longitude } = req.body;

    const normalizedRole = role.toUpperCase();
    if (!ROLES.includes(normalizedRole)) {
      throw new AppError('Invalid role', 400);
    }

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { code: otpCode, expiresAt: otpExpiresAt } = generateOTP();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: normalizedRole,
        otp: otpCode,
        otpExpiresAt,
        // Create provider profile if not a customer
        ...(normalizedRole === 'PROVIDER' && {
          provider: {
            create: {
              businessName: businessName || name,
              category: category || 'general',
              latitude: latitude ? parseFloat(latitude) : null,
              longitude: longitude ? parseFloat(longitude) : null,
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Log OTP for dev
    console.log('\n' + '='.repeat(50));
    console.log(`[OTP] Email  : ${user.email}`);
    console.log(`[OTP] Code   : ${otpCode}`);
    console.log(`[OTP] Expires: ${otpExpiresAt.toISOString()}`);
    console.log('='.repeat(50) + '\n');

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otpCode);
    } catch (emailErr) {
      console.warn(`[OTP] Email delivery failed: ${emailErr.message}`);
    }

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      pendingVerification: true,
      email: user.email,
      ...(process.env.NODE_ENV === 'development' && { devOTP: otpCode }),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) throw new AppError('User not found', 404);
    if (user.isEmailVerified) throw new AppError('Email already verified', 400);
    if (user.otp !== otp || new Date() > user.otpExpiresAt) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Activate account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    const { password: _, otp: _o, otpExpiresAt: _e, ...safeUser } = user;

    res.json({
      message: 'Email verified successfully!',
      user: safeUser,
      accessToken,
      refreshToken,
      isFirstLogin: true,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-otp
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) throw new AppError('User not found', 404);
    if (user.isEmailVerified) throw new AppError('Email already verified', 400);

    const { code: otpCode, expiresAt: otpExpiresAt } = generateOTP();

    await prisma.user.update({
      where: { id: user.id },
      data: { otp: otpCode, otpExpiresAt },
    });

    console.log(`[OTP RESEND] ${user.email}: ${otpCode}`);

    try {
      await sendOTPEmail(user.email, otpCode);
    } catch (emailErr) {
      console.warn(`[OTP] Resend failed: ${emailErr.message}`);
    }

    res.json({
      message: 'New verification code sent',
      ...(process.env.NODE_ENV === 'development' && { devOTP: otpCode }),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { provider: true },
    });

    if (!user) throw new AppError('Invalid email or password', 401);

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        pendingVerification: true,
        email: user.email,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new AppError('Invalid email or password', 401);

    const isFirstLogin = user.isFirstLogin;
    if (isFirstLogin) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isFirstLogin: false },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    const { password: _, otp: _o, otpExpiresAt: _e, ...safeUser } = user;

    res.json({
      message: 'Login successful',
      user: safeUser,
      accessToken,
      refreshToken,
      isFirstLogin,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete the specific refresh token
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout-all
const logoutAll = async (req, res, next) => {
  try {
    await revokeAllTokens(req.user.id);
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        isFirstLogin: true,
        createdAt: true,
        provider: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, businessName, address, city, state, pincode, latitude, longitude } = req.body;

    const userData = {};
    if (name) userData.name = name;
    if (phone) userData.phone = phone;
    if (avatar) userData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        provider: true,
      },
    });

    // Update provider profile if exists
    if (user.role === 'PROVIDER' && user.provider) {
      const providerData = {};
      if (businessName) providerData.businessName = businessName;
      if (address) providerData.address = address;
      if (city) providerData.city = city;
      if (state) providerData.state = state;
      if (pincode) providerData.pincode = pincode;
      if (latitude) providerData.latitude = parseFloat(latitude);
      if (longitude) providerData.longitude = parseFloat(longitude);

      if (Object.keys(providerData).length > 0) {
        await prisma.provider.update({
          where: { id: user.provider.id },
          data: providerData,
        });
      }
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const completeFirstLogin = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isFirstLogin: false },
    });
    res.json({ message: 'First login completed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  verifyOTP,
  resendOTP,
  login,
  logout,
  logoutAll,
  getMe,
  updateProfile,
  completeFirstLogin,
};
