import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyAccessToken } from '../utils/token';
import { Vendor, VendorRole } from '../modules/vendors/vendor.model';

export const authenticate = asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        throw new AppError(401, 'Authentication required', 'NO_TOKEN');
    }
    const payload = verifyAccessToken(header.slice(7));
    const vendor = await Vendor.findById(payload.sub);
    if (!vendor || !vendor.isActive) {
        throw new AppError(401, 'Account not found or disabled', 'ACCOUNT_INVALID');
    }
    req.vendor = vendor;
    next();
});

export const requireRole =
    (...roles: VendorRole[]) =>
        (req: Request, _res: Response, next: NextFunction) => {
            if (!req.vendor || !roles.includes(req.vendor.role)) {
                return next(new AppError(403, 'You do not have permission to do this', 'FORBIDDEN'));
            }
            next();
        };