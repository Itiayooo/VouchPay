const MAX_SIDE = 1600;

// Shrinks phone photos before upload so they send quickly on slow data
export async function compressImage(file: File): Promise<Blob> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        return blob && blob.size < file.size ? blob : file;
    } catch {
        return file;
    }
}

export const thumbUrl = (url: string) => url.replace('/upload/', '/upload/c_fill,w_240,h_240,q_auto,f_auto/');