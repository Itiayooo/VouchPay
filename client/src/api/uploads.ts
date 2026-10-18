import { api } from './client';

export interface UploadSignature {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    signature: string;
}

export const getBuyerSignature = (reference: string, token: string) =>
    api<UploadSignature>(`/disputes/buyer/${encodeURIComponent(reference)}/upload-signature`, {
        method: 'POST',
        headers: { 'x-buyer-token': token },
    });

export const getVendorSignature = (id: string) =>
    api<UploadSignature>(`/disputes/${id}/upload-signature`, { method: 'POST', auth: true });

export async function uploadToCloudinary(file: Blob, sig: UploadSignature): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('folder', sig.folder);
    form.append('signature', sig.signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
        method: 'POST',
        body: form,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.secure_url) {
        throw new Error(json?.error?.message ?? 'The upload failed. Check your connection and try again.');
    }
    return json.secure_url as string;
}