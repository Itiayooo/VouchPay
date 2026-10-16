import { AppError } from '../../utils/AppError';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/token';
import { IVendorDocument, Vendor } from '../vendors/vendor.model';
import { LoginInput, RegisterInput, UpdateProfileInput } from './auth.schema';

async function issueTokens(vendor: IVendorDocument) {
    const accessToken = signAccessToken({ sub: vendor.id, role: vendor.role });
    const refreshToken = signRefreshToken(vendor.id);
    await Vendor.updateOne({ _id: vendor._id }, { refreshTokenHash: hashToken(refreshToken) });
    return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
    const exists = await Vendor.exists({ email: input.email });
    if (exists) throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');

    try {
        const vendor = await Vendor.create(input);
        const tokens = await issueTokens(vendor);
        return { vendor, ...tokens };
    } catch (err: any) {
        if (err?.code === 11000) {
            throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
        }
        throw err;
    }
}

export async function login({ email, password }: LoginInput) {
    const vendor = await Vendor.findOne({ email }).select('+password');
    if (!vendor || !(await vendor.comparePassword(password))) {
        throw new AppError(401, 'Invalid email or password', 'BAD_CREDENTIALS');
    }
    if (!vendor.isActive) throw new AppError(403, 'This account has been disabled', 'ACCOUNT_DISABLED');

    const tokens = await issueTokens(vendor);
    return { vendor, ...tokens };
}

export async function refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const vendor = await Vendor.findById(payload.sub).select('+refreshTokenHash');
    if (!vendor || !vendor.isActive || vendor.refreshTokenHash !== hashToken(refreshToken)) {
        throw new AppError(401, 'Invalid or expired refresh token', 'REFRESH_INVALID');
    }
    return issueTokens(vendor); // rotates: the old refresh token stops working
}

export async function logout(vendorId: string) {
    await Vendor.updateOne({ _id: vendorId }, { $unset: { refreshTokenHash: 1 } });
}

export async function updateProfile(vendorId: string, input: UpdateProfileInput) {
    const vendor = await Vendor.findByIdAndUpdate(vendorId, input, { new: true, runValidators: true });
    if (!vendor) throw new AppError(404, 'Vendor not found');
    return vendor;
}