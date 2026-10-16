import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from './AppError';

export interface AccessPayload {
    sub: string;
    role: string;
}
export interface RefreshPayload {
    sub: string;
    jti: string;
}

export function signAccessToken(payload: AccessPayload): string {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, { expiresIn: '15m' });
}

export function signRefreshToken(sub: string): string {
    return jwt.sign({ sub, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string): AccessPayload {
    try {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as unknown as AccessPayload;
    } catch {
        throw new AppError(401, 'Invalid or expired token', 'TOKEN_INVALID');
    }
}

export function verifyRefreshToken(token: string): RefreshPayload {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as unknown as RefreshPayload;
    } catch {
        throw new AppError(401, 'Invalid or expired refresh token', 'REFRESH_INVALID');
    }
}

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}