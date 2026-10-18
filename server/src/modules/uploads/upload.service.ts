import crypto from 'crypto';
import { AppError } from '../../utils/AppError';

export function signUpload(reference: string) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new AppError(503, 'Photo uploads are not set up yet', 'UPLOADS_DISABLED');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `vouchpay/disputes/${reference}`;
    const signature = crypto
        .createHash('sha1')
        .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
        .digest('hex');

    return { cloudName, apiKey, timestamp, folder, signature };
}

// Evidence may only be photos uploaded to our own Cloudinary account
export function isOwnEvidenceUrl(url: string): boolean {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    return Boolean(cloud) && url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`);
}