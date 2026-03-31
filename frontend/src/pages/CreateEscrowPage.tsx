import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, CheckCircle2, Copy, Share2, MessageCircle } from 'lucide-react';
import VendorSidebar from '../components/layout/VendorSidebar';
import { useApp } from '../context/AppContext';
import {
  formatNairaFromUnits,
  generateReference,
  generateQRToken,
  generateBackupPin,
  calculatePlatformFee,
} from '../utils';
import { EscrowTransaction } from '../types';
import { MOCK_VENDOR } from '../utils';
import toast from 'react-hot-toast';

export default function CreateEscrowPage() {
  const navigate = useNavigate();
  const { addTransaction } = useApp();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<EscrowTransaction | null>(null);

  const [form, setForm] = useState({
    itemDescription: '',
    itemAmount: '',
    deliveryFee: '',
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    notes: '',
  });

  const itemAmountNum = parseFloat(form.itemAmount) || 0;
  const deliveryFeeNum = parseFloat(form.deliveryFee) || 0;
  const itemAmountKobo = Math.round(itemAmountNum * 100);
  const deliveryFeeKobo = Math.round(deliveryFeeNum * 100);
  const platformFeeKobo = calculatePlatformFee(itemAmountKobo);
  const totalKobo = itemAmountKobo + deliveryFeeKobo;
  const buyerPaysKobo = totalKobo; // platform fee is deducted from vendor payout

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemDescription || !form.itemAmount || !form.buyerName || !form.buyerPhone) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));

    const reference = generateReference();
    const txn: EscrowTransaction = {
      id: `txn_${Date.now()}`,
      reference,
      vendor: MOCK_VENDOR,
      buyer: {
        id: `b_${Date.now()}`,
        name: form.buyerName,
        phone: form.buyerPhone,
        email: form.buyerEmail || undefined,
      },
      itemDescription: form.itemDescription,
      itemAmount: itemAmountKobo,
      deliveryFee: deliveryFeeKobo,
      platformFee: platformFeeKobo,
      totalAmount: totalKobo,
      status: 'pending_payment',
      qrToken: generateQRToken(),
      backupPin: generateBackupPin(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      escrowLink: `${window.location.origin}/pay/${reference}`,
      notes: form.notes || undefined,
    };

    addTransaction(txn);
    setCreated(txn);
    setLoading(false);
    toast.success('Escrow link created! 🔐');
  };

  const copyLink = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.escrowLink);
    toast.success('Payment link copied!');
  };

  const shareWhatsApp = () => {
    if (!created) return;
    const msg = encodeURIComponent(
      `Hi ${created.buyer.name}! 👋\n\nHere's your secure payment link for: *${created.itemDescription}*\n\n💰 Amount: ${formatNairaFromUnits(created.itemAmount / 100)}\n🚚 Delivery: ${created.deliveryFee ? formatNairaFromUnits(created.deliveryFee / 100) : 'Included'}\n\n🔐 Pay securely via VouchPay:\n${created.escrowLink}\n\n✅ Your money is protected until you confirm delivery.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (created) {
    return (
      <div className="min-h-screen bg-ink-950 flex">
        <VendorSidebar />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <div className="max-w-lg w-full">
            {/* Success state */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-vault-500/15 border border-vault-500/30 flex items-center justify-center mx-auto mb-6 vault-glow">
                <CheckCircle2 size={36} className="text-vault-400" />
              </div>
              <h1 className="font-display font-bold text-3xl text-white mb-2">Escrow link created!</h1>
              <p className="text-ink-400">Share this link with {created.buyer.name}. Once they pay, you'll be notified immediately.</p>
            </div>

            {/* Link card */}
            <div className="card vault-border p-6 mb-6">
              <div className="label mb-3">Secure payment link</div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-900 border border-white/5 mb-4">
                <div className="flex-1 font-mono text-sm text-vault-400 truncate">{created.escrowLink}</div>
                <button onClick={copyLink} className="text-ink-500 hover:text-white transition-colors flex-shrink-0">
                  <Copy size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={copyLink} className="btn-primary py-3 flex items-center justify-center gap-2 text-sm">
                  <Copy size={16} />
                  Copy Link
                </button>
                <button onClick={shareWhatsApp} className="btn-secondary py-3 flex items-center justify-center gap-2 text-sm border-vault-500/20 text-vault-400 hover:bg-vault-500/10">
                  <MessageCircle size={16} />
                  Share on WhatsApp
                </button>
              </div>
            </div>

            {/* Order summary */}
            <div className="card p-6 mb-6">
              <h3 className="font-display font-semibold text-white mb-4">{created.itemDescription}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-500">Buyer</span>
                  <span className="text-white">{created.buyer.name} · {created.buyer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Item amount</span>
                  <span className="text-white font-mono">{formatNairaFromUnits(created.itemAmount / 100)}</span>
                </div>
                {created.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-500">Delivery fee</span>
                    <span className="text-white font-mono">{formatNairaFromUnits(created.deliveryFee / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-500">Platform fee (1.5%)</span>
                  <span className="text-red-400 font-mono">- {formatNairaFromUnits(created.platformFee / 100)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                  <span className="text-ink-400 font-medium">You receive</span>
                  <span className="text-vault-400 font-mono font-bold">
                    {formatNairaFromUnits((created.totalAmount - created.platformFee) / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">Expires</span>
                  <span className="text-ink-600">{created.expiresAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1 py-3">
                Back to Dashboard
              </button>
              <button onClick={() => { setCreated(null); setForm({ itemDescription: '', itemAmount: '', deliveryFee: '', buyerName: '', buyerPhone: '', buyerEmail: '', notes: '' }); }} className="btn-primary flex-1 py-3">
                Create Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <VendorSidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-ink-400 hover:text-white transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="font-display font-bold text-2xl text-white">Create Escrow Link</h1>
              <p className="text-ink-500 text-sm">Set up a secure payment for your buyer</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item details */}
            <div className="card p-6">
              <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-vault-500/20 text-vault-400 text-xs flex items-center justify-center font-bold">1</span>
                Item Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label block mb-2">Item description *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Zara Leather Tote Bag (Brown, Large)"
                    value={form.itemDescription}
                    onChange={e => setForm({ ...form, itemDescription: e.target.value })}
                    required
                  />
                  <p className="text-ink-600 text-xs mt-1">Be specific — this is what the buyer agreed to purchase</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-2">Item price (₦) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 font-mono text-sm">₦</span>
                      <input
                        type="number"
                        className="input-field pl-8 font-mono"
                        placeholder="45,000"
                        min="0"
                        value={form.itemAmount}
                        onChange={e => setForm({ ...form, itemAmount: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label block mb-2">Delivery fee (₦)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 font-mono text-sm">₦</span>
                      <input
                        type="number"
                        className="input-field pl-8 font-mono"
                        placeholder="3,000"
                        min="0"
                        value={form.deliveryFee}
                        onChange={e => setForm({ ...form, deliveryFee: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label block mb-2">Notes (optional)</label>
                  <textarea
                    className="input-field resize-none"
                    rows={2}
                    placeholder="e.g. Item ships Monday. WhatsApp for questions."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Buyer details */}
            <div className="card p-6">
              <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-vault-500/20 text-vault-400 text-xs flex items-center justify-center font-bold">2</span>
                Buyer Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-2">Buyer name *</label>
                    <input
                      className="input-field"
                      placeholder="Chioma Eze"
                      value={form.buyerName}
                      onChange={e => setForm({ ...form, buyerName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label block mb-2">Buyer phone *</label>
                    <input
                      className="input-field"
                      placeholder="+234 8012 345 678"
                      value={form.buyerPhone}
                      onChange={e => setForm({ ...form, buyerPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label block mb-2">Buyer email (optional)</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="chioma@gmail.com"
                    value={form.buyerEmail}
                    onChange={e => setForm({ ...form, buyerEmail: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Fee breakdown */}
            {itemAmountNum > 0 && (
              <div className="card p-6 border-vault-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={16} className="text-vault-400" />
                  <h3 className="font-medium text-white text-sm">Fee Breakdown</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Item price</span>
                    <span className="text-white font-mono">{formatNairaFromUnits(itemAmountNum)}</span>
                  </div>
                  {deliveryFeeNum > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink-500">Delivery fee</span>
                      <span className="text-white font-mono">{formatNairaFromUnits(deliveryFeeNum)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-500">Buyer pays total</span>
                    <span className="text-white font-mono font-medium">{formatNairaFromUnits((itemAmountNum + deliveryFeeNum))}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span className="text-ink-500">Platform fee (deducted from your payout)</span>
                    <span className="text-red-400 font-mono">- {formatNairaFromUnits(platformFeeKobo / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vault-400 font-medium">You receive</span>
                    <span className="text-vault-400 font-mono font-bold">
                      {formatNairaFromUnits((totalKobo - platformFeeKobo) / 100)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
              ) : (
                <>Generate Secure Escrow Link 🔐</>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
