import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield, Lock, CheckCircle2, QrCode, Eye, EyeOff,
  CreditCard, Smartphone, Building2, Info, ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira, formatNairaFromUnits } from '../utils';
import { MOCK_VENDOR } from '../utils';
import toast from 'react-hot-toast';

type PayStep = 'review' | 'pay' | 'processing' | 'done';
type PayMethod = 'card' | 'transfer' | 'ussd';

export default function BuyerPaymentPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { transactions, updateTransaction } = useApp();

  // Resolve transaction first (needed to derive initial step)
  const decodedRef = reference ? decodeURIComponent(reference) : '';

  const DEMO_TXN = {
    id: 'demo',
    reference: 'VP-2024-DEMO01',
    vendor: MOCK_VENDOR,
    buyer: { id: 'b_demo', name: 'You', phone: '+2348099999999' },
    itemDescription: 'Vintage Chanel Flap Bag (Medium, Black Caviar)',
    itemAmount: 7500000,
    deliveryFee: 500000,
    platformFee: 112500,
    totalAmount: 8000000,
    status: 'pending_payment' as const,
    qrToken: 'demo_token_123',
    backupPin: '2847',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    escrowLink: window.location.href,
    notes: 'Ships via Gig Logistics. Lagos only.',
  };

  const txn = decodedRef === 'demo'
    ? DEMO_TXN
    : transactions.find(t => t.reference === decodedRef) ?? null;

  // Fix 3: derive step from persisted status so refresh after payment
  // shows the success screen, not the payment form again.
  const getInitialStep = (): PayStep => {
    if (!txn || txn.id === 'demo') return 'review';
    if (['funded', 'in_transit', 'delivered', 'released'].includes(txn.status)) return 'done';
    return 'review';
  };

  const [step, setStep] = useState<PayStep>(getInitialStep);
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [showCVV, setShowCVV] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [processing, setProcessing] = useState(false);


  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    if (payMethod === 'card' && (!card.number || !card.expiry || !card.cvv || !card.name)) {
      toast.error('Please fill in all card details');
      return;
    }
    setStep('processing');
    await new Promise(r => setTimeout(r, 2500));

    if (txn && txn.id !== 'demo') {
      updateTransaction(txn.id, { status: 'funded', paidAt: new Date() });
    }
    setStep('done');
  };

  if (!txn) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">Link not found</h2>
          <p className="text-ink-500 text-sm">This escrow link may have expired or doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-2 border-vault-500/20 border-t-vault-500 animate-spin mx-auto mb-6" />
          <h2 className="font-display font-bold text-2xl text-white mb-2">Processing payment…</h2>
          <p className="text-ink-500 text-sm">Please don't close this tab</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          {/* Success */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-vault-500/20 border-2 border-vault-500/40 flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
              <CheckCircle2 size={44} className="text-vault-400" />
            </div>
            <h1 className="font-display font-bold text-3xl text-white mb-2">Payment Secured! 🔐</h1>
            <p className="text-ink-400 leading-relaxed">
              Your {formatNaira(txn.totalAmount)} is locked in the VouchPay vault.
              The vendor has been notified and will ship soon.
            </p>
          </div>

          {/* What happens next */}
          <div className="card p-6 mb-6">
            <h3 className="font-display font-semibold text-white mb-4 text-sm">What happens next</h3>
            <div className="space-y-4">
              {[
                { icon: '📦', title: 'Vendor ships your item', desc: 'They\'ll notify you once dispatched' },
                { icon: '🚪', title: 'Rider arrives at your door', desc: 'Inspect the item carefully before scanning' },
                { icon: '📱', title: 'Show your QR code', desc: 'Open VouchPay and show the QR — vendor scans it' },
                { icon: '✅', title: 'Deal complete!', desc: 'Vendor gets paid, you keep the item' },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{s.icon}</span>
                  <div>
                    <div className="text-white text-sm font-medium">{s.title}</div>
                    <div className="text-ink-500 text-xs">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QR button */}
          <button
            onClick={() => navigate(`/qr/${txn.reference}`)}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base mb-3"
          >
            <QrCode size={18} />
            View My QR Code & PIN
          </button>

          <p className="text-center text-ink-600 text-xs">
            Your QR code has also been sent to {txn.buyer.phone} via WhatsApp
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col lg:flex-row">
      {/* Left — order summary */}
      <div className="lg:w-[400px] lg:min-h-screen bg-ink-900 border-r border-white/5 p-8 flex flex-col">
        {/* VouchPay badge */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-lg bg-vault-500 flex items-center justify-center">
            <Shield size={14} className="text-ink-950" />
          </div>
          <span className="font-display font-bold text-white">VouchPay</span>
          <span className="ml-auto text-xs text-ink-600 flex items-center gap-1">
            <Lock size={10} />
            Secure escrow
          </span>
        </div>

        {/* Vendor */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {txn.vendor.businessName[0]}
          </div>
          <div>
            <div className="text-white font-display font-semibold">{txn.vendor.businessName}</div>
            <div className="text-ink-500 text-sm flex items-center gap-1">
              <span>⭐ {txn.vendor.rating}</span>
              <span>·</span>
              <span>{txn.vendor.totalTransactions} sales</span>
              {txn.vendor.verified && (
                <span className="ml-1 flex items-center gap-0.5 text-vault-500 text-xs">
                  <CheckCircle2 size={10} /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Item */}
        <div className="mb-8">
          <div className="label mb-2">You're buying</div>
          <div className="text-white font-medium leading-snug mb-1">{txn.itemDescription}</div>
          {txn.notes && (
            <div className="text-ink-500 text-sm mt-2 p-3 rounded-xl bg-white/3">{txn.notes}</div>
          )}
        </div>

        {/* Breakdown */}
        <div className="space-y-3 text-sm mb-8">
          <div className="flex justify-between">
            <span className="text-ink-500">Item price</span>
            <span className="text-white font-mono">{formatNaira(txn.itemAmount)}</span>
          </div>
          {txn.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-500">Delivery fee</span>
              <span className="text-white font-mono">{formatNaira(txn.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-3 font-medium">
            <span className="text-white">Total</span>
            <span className="text-white font-mono text-base">{formatNaira(txn.totalAmount)}</span>
          </div>
        </div>

        {/* Protection notice */}
        <div className="mt-auto p-4 rounded-2xl bg-vault-500/5 border border-vault-500/15">
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-vault-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-ink-400 leading-relaxed">
              <span className="text-vault-400 font-medium">VouchPay Protection:</span> Your money is held in escrow and only released when you physically confirm receipt via QR code. If anything goes wrong, raise a dispute and we'll mediate.
            </div>
          </div>
        </div>
      </div>

      {/* Right — payment form */}
      <div className="flex-1 p-8 flex items-start justify-center pt-16">
        <div className="w-full max-w-md">
          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-1">Review your order</h1>
                <p className="text-ink-500 text-sm">Make sure everything looks right before paying</p>
              </div>

              <div className="card p-5">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Reference</span>
                    <span className="text-white font-mono text-xs">{txn.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Vendor</span>
                    <span className="text-white">{txn.vendor.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Item</span>
                    <span className="text-white text-right max-w-[60%] text-xs leading-snug">{txn.itemDescription}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-3">
                    <span className="text-white font-medium">You pay</span>
                    <span className="text-vault-400 font-mono font-bold text-lg">{formatNaira(txn.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-400/15 bg-amber-400/5">
                <div className="flex items-start gap-2 text-xs text-ink-400">
                  <Info size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>After payment, you'll receive a <strong className="text-amber-400">unique QR code</strong> and 4-digit backup PIN. Only show these when you're satisfied with the item at delivery.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 cursor-pointer" onClick={() => setAgreed(!agreed)}>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${agreed ? 'bg-vault-500 border-vault-500' : 'border-white/20'}`}>
                  {agreed && <CheckCircle2 size={12} className="text-ink-950" />}
                </div>
                <span className="text-ink-400 text-sm">
                  I understand that funds will be held in escrow and only released when I scan the QR code at delivery.
                </span>
              </div>

              <button
                onClick={() => setStep('pay')}
                disabled={!agreed}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Proceed to Payment
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'pay' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-1">Payment</h1>
                <p className="text-ink-500 text-sm">Pay {formatNaira(txn.totalAmount)} into escrow</p>
              </div>

              {/* Method tabs */}
              <div className="flex rounded-xl bg-ink-900 p-1 border border-white/5">
                {([
                  { id: 'card', label: 'Card', icon: <CreditCard size={14} /> },
                  { id: 'transfer', label: 'Transfer', icon: <Building2 size={14} /> },
                  { id: 'ussd', label: 'USSD', icon: <Smartphone size={14} /> },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPayMethod(m.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                      payMethod === m.id ? 'bg-white/10 text-white' : 'text-ink-500 hover:text-ink-300'
                    }`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Card form */}
              {payMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="label block mb-2">Card number</label>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                      <input
                        className="input-field pl-10 font-mono tracking-widest"
                        placeholder="0000 0000 0000 0000"
                        value={card.number}
                        onChange={e => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label block mb-2">Expiry</label>
                      <input
                        className="input-field font-mono"
                        placeholder="MM/YY"
                        value={card.expiry}
                        onChange={e => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label block mb-2">CVV</label>
                      <div className="relative">
                        <input
                          type={showCVV ? 'text' : 'password'}
                          className="input-field font-mono pr-10"
                          placeholder="•••"
                          maxLength={4}
                          value={card.cvv}
                          onChange={e => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })}
                        />
                        <button type="button" onClick={() => setShowCVV(!showCVV)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600">
                          {showCVV ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label block mb-2">Name on card</label>
                    <input
                      className="input-field"
                      placeholder="CHIOMA EZE"
                      value={card.name}
                      onChange={e => setCard({ ...card, name: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              )}

              {/* Bank transfer */}
              {payMethod === 'transfer' && (
                <div className="card p-6 space-y-4">
                  <div className="label mb-3">Transfer to this account</div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Bank</span>
                      <span className="text-white font-medium">Wema Bank (ALAT)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Account number</span>
                      <span className="text-white font-mono">9012345678</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Account name</span>
                      <span className="text-white">VouchPay / {txn.reference}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-3">
                      <span className="text-ink-500">Amount</span>
                      <span className="text-vault-400 font-mono font-bold">{formatNaira(txn.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400">
                    ⚠️ This account is unique to your order. It expires in 30 minutes.
                  </div>
                </div>
              )}

              {/* USSD */}
              {payMethod === 'ussd' && (
                <div className="card p-6 text-center">
                  <div className="font-mono text-3xl font-bold text-white mb-3">*737*2*{formatNaira(txn.totalAmount).replace(/[₦,]/g, '')}*9012345678#</div>
                  <div className="text-ink-500 text-sm mb-4">Dial this code on your GTBank line</div>
                  <button
                    onClick={() => navigator.clipboard.writeText(`*737*2*${txn.totalAmount / 100}*9012345678#`)}
                    className="btn-secondary text-sm py-2 px-6"
                  >
                    Copy USSD Code
                  </button>
                  <div className="mt-4 text-ink-600 text-xs">Other banks: 000 = Zenith · 822 = Access · 894 = GTBank</div>
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={processing}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
              >
                <Lock size={16} />
                Pay {formatNaira(txn.totalAmount)} into Escrow
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-ink-700">
                <span className="flex items-center gap-1"><Shield size={11} /> 256-bit SSL</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={11} /> PCI DSS</span>
                <span>Powered by Paystack</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}