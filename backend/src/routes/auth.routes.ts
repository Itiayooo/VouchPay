import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import { Vendor } from '../models/Vendor';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';
import { AuthRequest, JwtPayload } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// ─── Token generation helpers ─────────────────────────────────────────────────

const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  });

const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret', {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
  });

// ─── POST /auth/register ──────────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('businessName').trim().notEmpty().withMessage('Business name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('bankName').trim().notEmpty().withMessage('Bank name is required'),
    body('accountNumber')
      .trim()
      .isLength({ min: 10, max: 10 })
      .withMessage('Account number must be 10 digits'),
    body('accountName').trim().notEmpty().withMessage('Account name is required'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const {
      name, businessName, email, password, phone,
      instagramHandle, whatsappNumber,
      bankName, accountNumber, accountName,
    } = req.body;

    const existing = await Vendor.findOne({ email });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const vendor = await Vendor.create({
      name, businessName, email, password, phone,
      instagramHandle, whatsappNumber,
      bankName, accountNumber, accountName,
    });

    const payload: JwtPayload = {
      id: vendor._id.toString(),
      role: vendor.role,
      email: vendor.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token hash
    vendor.refreshToken = refreshToken;
    await vendor.save();

    logger.info(`New vendor registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        vendor: vendor.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  }
);

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const vendor = await Vendor.findOne({ email }).select('+password');
    if (!vendor || !(await vendor.comparePassword(password))) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    if (!vendor.isActive) {
      res.status(403).json({ success: false, error: 'Account suspended. Contact support.' });
      return;
    }

    const payload: JwtPayload = {
      id: vendor._id.toString(),
      role: vendor.role,
      email: vendor.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    vendor.refreshToken = refreshToken;
    await vendor.save();

    logger.info(`Vendor logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        vendor: vendor.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  }
);

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ success: false, error: 'Refresh token required' });
    return;
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refresh_secret'
    ) as JwtPayload;

    const vendor = await Vendor.findById(decoded.id).select('+refreshToken');
    if (!vendor || vendor.refreshToken !== refreshToken) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    const payload: JwtPayload = { id: vendor._id.toString(), role: vendor.role, email: vendor.email };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    vendor.refreshToken = newRefreshToken;
    await vendor.save();

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const vendor = await Vendor.findById(req.user!.id);
  if (!vendor) {
    res.status(404).json({ success: false, error: 'Vendor not found' });
    return;
  }
  res.json({ success: true, data: vendor.toJSON() });
});

// ─── PUT /auth/profile ────────────────────────────────────────────────────────

router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('businessName').optional().trim().notEmpty(),
    body('phone').optional().trim().notEmpty(),
    body('instagramHandle').optional().trim(),
    body('whatsappNumber').optional().trim(),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const allowed = ['name', 'businessName', 'phone', 'instagramHandle', 'whatsappNumber', 'avatarUrl'];
    const updates: Record<string, unknown> = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const vendor = await Vendor.findByIdAndUpdate(req.user!.id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: vendor?.toJSON() });
  }
);

// ─── POST /auth/logout ────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await Vendor.findByIdAndUpdate(req.user!.id, { refreshToken: null });
  res.json({ success: true, message: 'Logged out' });
});

export default router;
