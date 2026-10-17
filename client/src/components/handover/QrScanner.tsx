import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import FormError from '../ui/FormError';

interface Detector {
    detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (opts?: { formats: string[] }) => Detector;

export const canScan = () =>
    typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia);

export default function QrScanner({ onCode, onCancel }: { onCode: (code: string) => void; onCancel: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const handler = useRef(onCode);
    const [error, setError] = useState('');

    useEffect(() => {
        handler.current = onCode;
    });

    useEffect(() => {
        let stream: MediaStream | undefined;
        let timer: number | undefined;
        let stopped = false;
        const fail = () =>
            setError('We could not open the camera. Allow camera access, or ask the buyer to read their 4-digit PIN.');

        let detector: Detector;
        try {
            const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
            detector = new Ctor({ formats: ['qr_code'] });
        } catch {
            fail();
            return;
        }

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
            .then(async (s) => {
                if (stopped) {
                    s.getTracks().forEach((track) => track.stop());
                    return;
                }
                stream = s;
                const video = videoRef.current;
                if (!video) return;
                video.srcObject = s;
                await video.play();
                timer = window.setInterval(async () => {
                    try {
                        const codes = await detector.detect(video);
                        const hit = codes.map((c) => c.rawValue.trim()).find((v) => /^[a-f0-9]{64}$/i.test(v));
                        if (hit) {
                            window.clearInterval(timer);
                            handler.current(hit);
                        }
                    } catch {
                        // the camera frame isn't ready yet
                    }
                }, 300);
            })
            .catch(fail);

        return () => {
            stopped = true;
            if (timer) window.clearInterval(timer);
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    return (
        <div className="grid gap-4">
            {error ? (
                <FormError message={error} />
            ) : (
                <div className="overflow-hidden rounded-[20px] bg-night">
                    <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
                </div>
            )}
            <p className="text-sm text-night-mute">Hold the buyer's QR code in the square. It scans by itself.</p>
            <Button variant="outline" onClick={onCancel}>
                Cancel
            </Button>
        </div>
    );
}