import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, QrCode, CheckCircle2, Zap, AlertTriangle,
  RotateCcw, Hash, Shield, Camera, CameraOff,
} from 'lucide-react';
import VendorSidebar from '../components/layout/VendorSidebar';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils';
import toast from 'react-hot-toast';

type ScanState = 'idle' | 'scanning' | 'verifying' | 'success' | 'error';
type ScanMode = 'qr' | 'pin';

export default function VendorScanPage() {
  const navigate = useNavigate();
  const { transactions, updateTransaction } = useApp();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMode, setScanMode] = useState<ScanMode>('qr');
  const [pinInput, setPinInput] = useState(['', '', '', '']);
  const [matchedTxn, setMatchedTxn] = useState<typeof transactions[0] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const activeTransactions = transactions.filter(
    t => t.status === 'in_transit' || t.status === 'funded'
  );

  // ─── Stop camera cleanly ─────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Process a scanned QR value ──────────────────────────────────────────────
  const processQRValue = useCallback((raw: string) => {
    stopCamera();
    setScanState('verifying');

    setTimeout(() => {
      try {
        const { ref, token } = JSON.parse(raw) as { ref: string; token: string };
        const found = transactions.find(
          t => t.reference === ref && t.qrToken === token && ['in_transit', 'funded'].includes(t.status)
        );

        if (found) {
          setMatchedTxn(found);
          setScanState('success');
          updateTransaction(found.id, {
            status: 'released',
            qrScannedAt: new Date(),
            releasedAt: new Date(),
            qrScanLocation: { lat: 6.5244 + (Math.random() - 0.5) * 0.01, lng: 3.3792 + (Math.random() - 0.5) * 0.01 },
          });
          toast.success('🎉 Funds released! Check your bank account.');
        } else {
          setScanState('error');
          setErrorMsg('QR code is invalid or already used. Ask the buyer to refresh their screen.');
        }
      } catch {
        setScanState('error');
        setErrorMsg('Could not read QR code. Make sure it\'s a VouchPay delivery code.');
      }
    }, 800);
  }, [transactions, updateTransaction, stopCamera]);

  // ─── Start camera and scanning loop ──────────────────────────────────────────
  const startCamera = async () => {
    setCameraError('');
    setScanState('scanning');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // BarcodeDetector is built into Chrome/Edge on Android; Safari 17+
      // @ts-ignore
      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ['qr_code'] });

        const scan = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(scan);
            return;
          }
          try {
            // @ts-ignore
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              processQRValue(codes[0].rawValue);
              return; // stop loop
            }
          } catch { /* frame not ready yet */ }
          animFrameRef.current = requestAnimationFrame(scan);
        };
        animFrameRef.current = requestAnimationFrame(scan);
      } else {
        // Fallback: BarcodeDetector not available — show manual entry hint
        stopCamera();
        setScanState('idle');
        setCameraError('QR scanning is not supported in this browser. Please use Chrome on Android, or use the PIN method below.');
      }
    } catch (err: any) {
      setScanState('idle');
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else {
        setCameraError('Could not access camera. Try the PIN method instead.');
      }
    }
  };

  // ─── PIN verification ─────────────────────────────────────────────────────────
  // The vendor types the PIN the BUYER tells them aloud. The PIN is never shown
  // to the vendor — only the buyer can see it on their QR page.
  const handlePinSubmit = () => {
    const pin = pinInput.join('');
    if (pin.length < 4) { toast.error('Enter all 4 digits'); return; }

    setScanState('verifying');
    setTimeout(() => {
      const found = transactions.find(
        t => t.backupPin === pin && ['in_transit', 'funded'].includes(t.status)
      );
      if (found) {
        setMatchedTxn(found);
        setScanState('success');
        updateTransaction(found.id, {
          status: 'released',
          qrScannedAt: new Date(),
          releasedAt: new Date(),
          qrScanLocation: { lat: 6.5244, lng: 3.3792 },
        });
        toast.success('🎉 PIN verified! Funds released.');
      } else {
        setScanState('error');
        setErrorMsg('Incorrect PIN. Ask the buyer to read it again from their VouchPay screen.');
        setPinInput(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    }, 800);
  };

  const handlePinKey = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pinInput];
    next[idx] = val.slice(-1);
    setPinInput(next);
    if (val && idx < 3) pinRefs[idx + 1].current?.focus();
  };

  const handlePinBackspace = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinInput[idx] && idx > 0) pinRefs[idx - 1].current?.focus();
    if (e.key === 'Enter' && pinInput.every(Boolean)) handlePinSubmit();
  };

  const reset = () => {
    stopCamera();
    setScanState('idle');
    setMatchedTxn(null);
    setErrorMsg('');
    setCameraError('');
    setPinInput(['', '', '', '']);
  };

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <VendorSidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => { stopCamera(); navigate('/dashboard'); }}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-ink-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Scan & Release</h1>
            <p className="text-ink-500 text-sm">Scan the buyer's QR code or enter their backup PIN to release funds</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: scanner area */}
          <div className="col-span-2">

            {/* Mode tabs — only shown at idle */}
            {scanState === 'idle' && (
              <div className="flex rounded-xl bg-ink-900 p-1 mb-6 border border-white/5 w-fit">
                {(['qr', 'pin'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setScanMode(m); setCameraError(''); }}
                    className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                      scanMode === m ? 'bg-white/10 text-white' : 'text-ink-500 hover:text-ink-300'
                    }`}
                  >
                    {m === 'qr' ? <><QrCode size={15} /> Scan QR Code</> : <><Hash size={15} /> Enter Buyer's PIN</>}
                  </button>
                ))}
              </div>
            )}

            {/* ── IDLE: QR mode ── */}
            {scanState === 'idle' && scanMode === 'qr' && (
              <div className="card p-8 text-center">
                <div className="w-72 h-72 rounded-3xl bg-ink-900 border border-white/10 flex items-center justify-center relative overflow-hidden mx-auto mb-6">
                  <Camera size={48} className="text-ink-700" />
                  {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-8 h-8`}>
                      <div className={`w-full h-full border-ink-600 ${
                        pos.includes('top') && pos.includes('left') ? 'border-t-2 border-l-2 rounded-tl-xl' :
                        pos.includes('top') ? 'border-t-2 border-r-2 rounded-tr-xl' :
                        pos.includes('left') ? 'border-b-2 border-l-2 rounded-bl-xl' :
                        'border-b-2 border-r-2 rounded-br-xl'
                      }`} />
                    </div>
                  ))}
                </div>
                {cameraError && (
                  <div className="mb-5 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-amber-400 text-sm">
                    {cameraError}
                  </div>
                )}
                <h2 className="font-display font-bold text-xl text-white mb-2">Ready to scan</h2>
                <p className="text-ink-500 text-sm mb-8">Ask the buyer to open their VouchPay QR code. Point your camera at it.</p>
                <button onClick={startCamera} className="btn-primary px-10 py-4 flex items-center gap-2 mx-auto text-base">
                  <Camera size={18} />
                  Start Camera
                </button>
              </div>
            )}

            {/* ── SCANNING: live camera feed ── */}
            {scanState === 'scanning' && (
              <div className="card p-4 text-center">
                <div className="relative rounded-2xl overflow-hidden mb-4 bg-black" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Dim corners */}
                    <div className="absolute inset-0 bg-black/30" style={{
                      maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, transparent 100%, black 100%)',
                    }} />
                    {/* Corners */}
                    {['top-6 left-6', 'top-6 right-6', 'bottom-6 left-6', 'bottom-6 right-6'].map((pos, i) => (
                      <div key={i} className={`absolute ${pos} w-10 h-10`}>
                        <div className={`w-full h-full border-vault-400 border-[3px] ${
                          pos.includes('top') && pos.includes('left') ? 'border-b-0 border-r-0 rounded-tl-lg' :
                          pos.includes('top') ? 'border-b-0 border-l-0 rounded-tr-lg' :
                          pos.includes('left') ? 'border-t-0 border-r-0 rounded-bl-lg' :
                          'border-t-0 border-l-0 rounded-br-lg'
                        }`} />
                      </div>
                    ))}
                    {/* Animated scan line */}
                    <div
                      className="absolute left-0 right-0 h-0.5 animate-scan-line"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.9), transparent)',
                        boxShadow: '0 0 10px rgba(34,197,94,0.7)',
                      }}
                    />
                  </div>
                </div>
                <p className="text-vault-400 text-sm font-medium mb-1">Scanning for QR code…</p>
                <p className="text-ink-600 text-xs mb-4">Hold the buyer's screen steady inside the frame</p>
                <button onClick={() => { stopCamera(); setScanState('idle'); }} className="btn-secondary text-sm px-6 py-2 flex items-center gap-2 mx-auto">
                  <CameraOff size={14} />
                  Cancel
                </button>
              </div>
            )}

            {/* ── IDLE: PIN mode ── */}
            {scanState === 'idle' && scanMode === 'pin' && (
              <div className="card p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-6">
                  <Hash size={28} className="text-amber-400" />
                </div>
                <h2 className="font-display font-bold text-xl text-white mb-2">Enter Buyer's Backup PIN</h2>
                <p className="text-ink-500 text-sm mb-2 max-w-xs mx-auto">
                  Ask the buyer to open their VouchPay QR page and read you their 4-digit backup PIN.
                </p>
                <p className="text-amber-400/70 text-xs mb-8 max-w-xs mx-auto">
                  Use this only when the buyer's phone has no internet connection.
                </p>

                {/* 4-digit PIN boxes */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  {pinRefs.map((ref, i) => (
                    <input
                      key={i}
                      ref={ref}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={pinInput[i]}
                      onChange={e => handlePinKey(i, e.target.value)}
                      onKeyDown={e => handlePinBackspace(i, e)}
                      className="w-16 h-16 text-center text-2xl font-mono font-bold bg-ink-900 border-2 border-white/10 focus:border-amber-400/60 rounded-xl text-white focus:outline-none transition-colors"
                    />
                  ))}
                </div>

                <button
                  onClick={handlePinSubmit}
                  disabled={pinInput.some(d => !d)}
                  className="btn-primary px-10 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Verify PIN & Release Funds
                </button>
              </div>
            )}

            {/* ── VERIFYING ── */}
            {scanState === 'verifying' && (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 rounded-full border-2 border-vault-500/30 border-t-vault-500 animate-spin mx-auto mb-6" />
                <h2 className="font-display font-bold text-xl text-white mb-2">Verifying…</h2>
                <p className="text-ink-500 text-sm">Checking against active orders</p>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {scanState === 'success' && matchedTxn && (
              <div className="space-y-6">
                <div className="card p-10 text-center vault-border vault-glow">
                  <div className="w-24 h-24 rounded-full bg-vault-500/20 border-2 border-vault-500/40 flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
                    <CheckCircle2 size={44} className="text-vault-400" />
                  </div>
                  <h2 className="font-display font-bold text-3xl text-white mb-2">Funds Released!</h2>
                  <div className="text-5xl font-display font-bold text-gradient-vault mb-3">
                    {formatNaira(matchedTxn.totalAmount - matchedTxn.platformFee)}
                  </div>
                  <p className="text-ink-400 mb-2">sent to your bank account</p>
                  <div className="flex items-center justify-center gap-2 text-vault-600 text-sm">
                    <Zap size={14} />
                    <span>Expect credit alert within 30 seconds</span>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-vault-500/15 flex items-center justify-center flex-shrink-0">
                      <Shield size={18} className="text-vault-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm mb-1">{matchedTxn.itemDescription}</div>
                      <div className="text-ink-500 text-xs font-mono">{matchedTxn.reference}</div>
                      <div className="text-ink-500 text-xs mt-1">Buyer: {matchedTxn.buyer.name}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={reset} className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2">
                    <RotateCcw size={15} /> Scan Another
                  </button>
                  <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1 py-3">
                    Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* ── ERROR ── */}
            {scanState === 'error' && (
              <div className="card p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle size={28} className="text-red-400" />
                </div>
                <h2 className="font-display font-bold text-xl text-white mb-2">Verification Failed</h2>
                <p className="text-ink-400 text-sm mb-8 max-w-xs mx-auto">{errorMsg}</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={reset} className="btn-secondary px-8 py-3 flex items-center gap-2">
                    <RotateCcw size={15} /> Try Again
                  </button>
                  <button onClick={() => { reset(); setScanMode('pin'); }} className="btn-primary px-8 py-3">
                    Use PIN Instead
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: active orders — NO PIN shown here */}
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="font-display font-semibold text-white text-sm">Active Orders</h3>
                <p className="text-ink-600 text-xs mt-0.5">Orders ready for delivery confirmation</p>
              </div>
              {activeTransactions.length === 0 ? (
                <div className="p-6 text-center text-ink-600 text-sm">No active deliveries</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {activeTransactions.map(t => (
                    <div key={t.id} className="p-4">
                      <div className="text-white text-sm font-medium truncate mb-1">{t.itemDescription}</div>
                      <div className="text-ink-500 text-xs mb-2">{t.buyer.name} · {t.buyer.phone}</div>
                      <div className="flex items-center justify-between">
                        <span className={`status-badge text-xs ${
                          t.status === 'in_transit'
                            ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
                            : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                        }`}>
                          {t.status === 'in_transit' ? 'In Transit' : 'Funded'}
                        </span>
                        <span className="text-vault-400 font-mono text-xs">{formatNaira(t.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How it works — updated to reflect correct PIN flow */}
            <div className="card p-5 space-y-4">
              <h3 className="font-display font-semibold text-white text-sm">How to confirm delivery</h3>
              {[
                { step: '1', text: 'Arrive with the package' },
                { step: '2', text: 'Let buyer inspect the item' },
                { step: '3', text: 'Buyer shows their QR code → you scan it' },
                { step: '4', text: 'No internet? Buyer reads their PIN → you type it' },
                { step: '5', text: 'Scan/PIN verified = instant payout' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-vault-500/15 text-vault-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <span className="text-ink-400">{s.text}</span>
                </div>
              ))}
            </div>

            {/* Camera support note */}
            <div className="card p-4 border-white/5">
              <p className="text-ink-600 text-xs leading-relaxed">
                <span className="text-ink-400 font-medium">Camera scanning</span> works on Chrome/Edge (Android) and Safari 17+ (iOS). For other browsers, use the PIN method.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}