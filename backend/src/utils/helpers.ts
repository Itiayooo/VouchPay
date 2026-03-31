import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

// ─── Reference Generation ─────────────────────────────────────────────────────

export const generateReference = (): string => {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VP-${year}-${random}`;
};

// ─── QR Token ─────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure one-time QR token.
 * Returns { rawToken, hash } — store the hash, send rawToken to buyer.
 */
export const generateQRToken = async (): Promise<{
  rawToken: string;
  hash: string;
}> => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(rawToken, 10);
  return { rawToken, hash };
};

/**
 * Verify a raw QR token against its stored hash.
 */
export const verifyQRToken = async (
  rawToken: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(rawToken, hash);
};

// ─── Backup PIN ───────────────────────────────────────────────────────────────

/**
 * Generate a 4-digit numeric backup PIN.
 * Returns { rawPin, hash }
 */
export const generateBackupPin = async (): Promise<{
  rawPin: string;
  hash: string;
}> => {
  const rawPin = String(Math.floor(1000 + Math.random() * 9000));
  const hash = await bcrypt.hash(rawPin, 10);
  return { rawPin, hash };
};

/**
 * Verify a raw PIN against its stored hash.
 */
export const verifyBackupPin = async (
  rawPin: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(rawPin, hash);
};

// ─── Platform Fee Calculation ─────────────────────────────────────────────────

const FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '1.5') / 100;
const FEE_MIN_KOBO = parseInt(process.env.PLATFORM_FEE_MIN_KOBO || '15000', 10);

export const calculatePlatformFee = (itemAmountKobo: number): number => {
  return Math.max(Math.round(itemAmountKobo * FEE_PERCENT), FEE_MIN_KOBO);
};

// ─── QR Code Image ────────────────────────────────────────────────────────────

/**
 * Generate a QR code as a data URL (base64 PNG) for a given value.
 * The QR encodes the buyer-facing URL that triggers scan verification.
 */
export const generateQRCodeImage = async (value: string): Promise<string> => {
  return QRCode.toDataURL(value, {
    width: 400,
    margin: 2,
    color: { dark: '#0a0a08', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
};

// ─── Escrow Link Builder ──────────────────────────────────────────────────────

export const buildEscrowLink = (reference: string): string => {
  const base = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  return `${base}/pay/${reference}`;
};

export const buildQRLink = (reference: string, rawToken: string): string => {
  const base = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  return `${base}/qr/${reference}?token=${rawToken}`;
};

// ─── Pagination Helper ────────────────────────────────────────────────────────

export const getPaginationMeta = (
  total: number,
  page: number,
  limit: number
) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
});

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export const getEscrowExpiry = (): Date => {
  const days = parseInt(process.env.ESCROW_EXPIRY_DAYS || '7', 10);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};
