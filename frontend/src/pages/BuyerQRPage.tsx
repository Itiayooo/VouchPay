import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield, AlertTriangle, ChevronDown, Clock,
  Download, Share2, Hash, Info,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils';
import { MOCK_VENDOR } from '../utils';
import toast from 'react-hot-toast';

export default function BuyerQRPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { transactions, updateTransaction } = useApp();
  const [showDispute, setShowDispute] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [qrRevealed, setQrRevealed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(7 * 24 * 60 * 60);

  const decodedRef = reference ? decodeURIComponent(reference) : '';

  const DEMO_TXN = {
    id: 'demo',
    reference: 'VP-2024-DEMO01',
    vendor: MOCK_VENDOR,
    buyer: { id: 'b_demo', name: 'Chioma Eze', phone: '+2348099999999' },
    itemDescription: 'Vintage Chanel Flap Bag (Medium, Black Caviar)',
    itemAmount: 7500000,
    deliveryFee: 500000,
    platformFee: 112500,
    totalAmount: 8000000,
    status: 'in_transit' as const,
    qrToken: 'demo_token_abc123xyz_scannable',
    backupPin: '2847',
    paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    shippedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    escrowLink: window.location.href,
  };

  const txn = decodedRef === 'demo'
    ? DEMO_TXN
    : (transactions.find(t => t.reference === decodedRef) ?? DEMO_TXN);

  const isActive = ['funded', 'in_transit'].includes(txn.status);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate REAL scannable QR when buyer taps reveal.
  // Encodes JSON { ref, token } — vendor scans and verifies the token.
  useEffect(() => {
    if (!qrRevealed) return;
    const payload = JSON.stringify({ ref: txn.reference, token: txn.qrToken });
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: { dark: '#0a0a08', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [qrRevealed, txn.reference, txn.qrToken]);

  const formatTimeLeft = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h remaining`;
    if (h > 0) return `${h}h ${m}m remaining`;
    return `${m}m ${s % 60}s remaining`;
  };

  const handleRaiseDispute = () => {
    if (!disputeReason || !disputeDesc) {
      toast.error('Please select a reason and describe the issue');
      return;
    }
    if (txn.id !== 'demo') {
      updateTransaction(txn.id, { status: 'disputed' });
    }
    toast.success('Dispute raised. A mediator will review within 2 hours.');
    setShowDispute(false);
    navigate('/');
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `VouchPay-QR-${txn.reference}.png`;
    a.click();
  };

  const disputeReasons = [
    'Item not as described', 'Item not received', 'Wrong item delivered',
    'Item is damaged', 'Counterfeit / fake item', 'Other',
  ];

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-start py-12 px-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-vault-500 flex items-center justify-center">
            <Shield size={14} className="text-ink-950" />
          </div>
          <span className="font-display font-bold text-white">VouchPay</span>
        </div>

        {/* Status banner for non-active */}
        {!isActive && (
          <div className={`mb-6 p-4 rounded-xl border text-sm text-center ${
            txn.status === 'released' ? 'bg-vault-500/10 border-vault-500/20 text-vault-400' :
            txn.status === 'disputed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            'bg-white/5 border-white/10 text-ink-400'
          }`}>
            {txn.status === 'released' && '✅ This order has been completed and funds released.'}
            {txn.status === 'disputed' && '⚠️ A dispute is open on this order. Funds are locked.'}
            {txn.status === 'pending_payment' && '⏳ Payment not yet confirmed for this order.'}
          </div>
        )}

        {/* Order info */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center text-white font-bold flex-shrink-0">
              {txn.vendor.businessName[0]}
            </div>
            <div className="min-w-0">
              <div className="text-white font-medium text-sm truncate">{txn.vendor.businessName}</div>
              <div className="text-ink-500 text-xs font-mono">{txn.reference}</div>
            </div>
          </div>
          <div className="text-ink-300 text-sm mb-3 leading-snug">{txn.itemDescription}</div>
          <div className="flex items-center justify-between text-sm border-t border-white/5 pt-3">
            <span className="text-ink-500">Secured amount</span>
            <span className="text-vault-400 font-mono font-bold">{formatNaira(txn.totalAmount)}</span>
          </div>
        </div>

        {/* QR Card */}
        <div className={`card p-6 mb-4 text-center ${isActive ? 'vault-border' : 'opacity-60'}`}>
          <div className="label mb-4">Your delivery QR code</div>

          {!qrRevealed ? (
            /* Hidden state — tap to reveal */
            <button
              onClick={() => isActive && setQrRevealed(true)}
              disabled={!isActive}
              className="w-60 h-60 mx-auto rounded-2xl bg-ink-900 border border-white/10 flex flex-col items-center justify-center gap-3 mb-4 hover:bg-ink-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
                <Shield size={28} className="text-ink-600" />
              </div>
              <div className="text-ink-400 text-sm font-medium">Tap to reveal QR</div>
              <div className="text-ink-700 text-xs max-w-[140px] text-center leading-snug">
                Show this only after inspecting the item at your door
              </div>
            </button>
          ) : (
            /* Real QR image */
            <div className="relative mb-4 flex justify-center">
              {qrDataUrl ? (
                <div className="relative">
                  <img
                    src={qrDataUrl}
                    alt="VouchPay delivery QR code"
                    className="w-60 h-60 rounded-2xl shadow-xl"
                  />
                  {/* Animated scan line */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute left-0 right-0 h-0.5 animate-scan-line"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.7), transparent)',
                        boxShadow: '0 0 8px rgba(34,197,94,0.5)',
                      }}
                    />
                  </div>
                  {/* Corner brackets */}
                  {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-7 h-7`}>
                      <div className={`w-full h-full border-vault-400 ${
                        pos.includes('top') && pos.includes('left') ? 'border-t-2 border-l-2 rounded-tl-xl' :
                        pos.includes('top') ? 'border-t-2 border-r-2 rounded-tr-xl' :
                        pos.includes('left') ? 'border-b-2 border-l-2 rounded-bl-xl' :
                        'border-b-2 border-r-2 rounded-br-xl'
                      }`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-60 h-60 rounded-2xl bg-ink-900 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-vault-500/30 border-t-vault-500 animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Expiry timer */}
          {isActive && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-ink-500 mb-4">
              <Clock size={11} />
              <span>{formatTimeLeft(timeLeft)}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
            <div className="flex items-start gap-2 text-xs text-left">
              <Info size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <span className="text-ink-400">
                <span className="text-amber-400 font-medium">One-time use.</span> Vendor scans this → funds release instantly. Only show after inspecting the item.
              </span>
            </div>
          </div>
        </div>

        {/* Backup PIN — buyer-only section */}
        <div className="card p-5 mb-4">
          <button
            onClick={() => setShowPin(!showPin)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-amber-400" />
              <span className="text-white font-medium text-sm">Backup PIN</span>
              <span className="text-ink-600 text-xs">· if your phone has no data</span>
            </div>
            <ChevronDown size={16} className={`text-ink-500 transition-transform ${showPin ? 'rotate-180' : ''}`} />
          </button>

          {showPin && (
            <div className="mt-4 pt-4 border-t border-white/5 text-center">
              <div className="font-mono text-4xl font-bold text-amber-400 tracking-[0.4em] mb-3">
                {isActive ? txn.backupPin : '••••'}
              </div>
              <div className="text-ink-500 text-xs max-w-[230px] mx-auto leading-relaxed">
                If your phone has no internet at delivery, <strong className="text-ink-300">read this PIN aloud</strong> to the vendor. They enter it to release funds. <span className="text-amber-500">Never share it before the item arrives at your door.</span>
              </div>
            </div>
          )}
        </div>

        {/* Download / Share (only after QR is revealed) */}
        {isActive && qrRevealed && qrDataUrl && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={downloadQR} className="btn-secondary py-2.5 flex items-center justify-center gap-2 text-sm">
              <Download size={14} />
              Save QR
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'VouchPay QR', url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied!');
                }
              }}
              className="btn-secondary py-2.5 flex items-center justify-center gap-2 text-sm"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        )}

        {/* Raise Dispute */}
        {isActive && !showDispute && (
          <button
            onClick={() => setShowDispute(true)}
            className="w-full btn-danger py-3 flex items-center justify-center gap-2 text-sm"
          >
            <AlertTriangle size={15} />
            Unhappy with item? Raise a Dispute
          </button>
        )}

        {showDispute && (
          <div className="card p-6 border-red-500/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="font-display font-semibold text-white">Raise a Dispute</h3>
            </div>
            <p className="text-ink-500 text-xs mb-4">
              Funds stay locked. A mediator reviews within 2 hours.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label block mb-2">Reason</label>
                <select className="input-field" value={disputeReason} onChange={e => setDisputeReason(e.target.value)}>
                  <option value="">Select a reason…</option>
                  {disputeReasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-2">Describe the issue</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="What's wrong with the item or delivery…"
                  value={disputeDesc}
                  onChange={e => setDisputeDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowDispute(false)} className="btn-secondary py-3 text-sm">Cancel</button>
                <button onClick={handleRaiseDispute} className="btn-danger py-3 text-sm">Submit</button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-ink-700 text-xs">
          Protected by VouchPay · {txn.reference}
        </div>
      </div>
    </div>
  );
}