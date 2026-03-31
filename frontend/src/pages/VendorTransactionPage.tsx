import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, QrCode, Clock, CheckCircle2, Truck, Shield,
  AlertTriangle, Phone, Mail, MapPin, ChevronRight, Package, Zap,
} from 'lucide-react';
import VendorSidebar from '../components/layout/VendorSidebar';
import { useApp } from '../context/AppContext';
import { formatNaira, formatDate, getStatusColor, getStatusLabel } from '../utils';
import toast from 'react-hot-toast';

export default function VendorTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions, updateTransaction } = useApp();

  const txn = transactions.find(t => t.id === id);

  if (!txn) {
    return (
      <div className="min-h-screen bg-ink-950 flex">
        <VendorSidebar />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="font-display font-bold text-xl text-white mb-2">Transaction not found</h2>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary mt-4">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const copyLink = () => {
    navigator.clipboard.writeText(txn.escrowLink);
    toast.success('Link copied!');
  };

  const copyRef = () => {
    navigator.clipboard.writeText(txn.reference);
    toast.success('Reference copied!');
  };

  const handleMarkShipped = async () => {
    updateTransaction(txn.id, { status: 'in_transit', shippedAt: new Date() });
    toast.success('Order marked as shipped! Buyer has been notified.');
  };

  const handleRaiseDispute = () => {
    navigate(`/dashboard`);
    toast('Dispute flow coming soon — contact support@vouchpay.ng', { icon: 'ℹ️' });
  };

  // Timeline steps
  const timelineSteps = [
    {
      label: 'Escrow Created',
      time: txn.createdAt,
      done: true,
      icon: <Shield size={14} />,
    },
    {
      label: 'Payment Secured',
      time: txn.paidAt,
      done: !!txn.paidAt,
      icon: <CheckCircle2 size={14} />,
      highlight: !txn.paidAt,
    },
    {
      label: 'Shipped',
      time: txn.shippedAt,
      done: !!txn.shippedAt,
      icon: <Truck size={14} />,
    },
    {
      label: 'QR Scanned / Delivered',
      time: txn.qrScannedAt,
      done: !!txn.qrScannedAt,
      icon: <QrCode size={14} />,
    },
    {
      label: 'Funds Released',
      time: txn.releasedAt,
      done: !!txn.releasedAt,
      icon: <Zap size={14} />,
    },
  ];

  const vendorReceives = txn.totalAmount - txn.platformFee;

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <VendorSidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-ink-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display font-bold text-xl text-white truncate max-w-md">
                {txn.itemDescription}
              </h1>
              <span className={`status-badge ${getStatusColor(txn.status)}`}>
                {getStatusLabel(txn.status)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-ink-500 text-sm">
              <span className="font-mono">{txn.reference}</span>
              <button onClick={copyRef} className="hover:text-ink-300 transition-colors">
                <Copy size={12} />
              </button>
              <span>·</span>
              <span>Created {formatDate(txn.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main content — left 2 cols */}
          <div className="col-span-2 space-y-6">

            {/* Status banner */}
            {txn.status === 'funded' && (
              <div className="rounded-2xl bg-vault-500/10 border border-vault-500/25 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-vault-500/20 flex items-center justify-center">
                    <Shield size={22} className="text-vault-400" />
                  </div>
                  <div>
                    <div className="text-vault-300 font-display font-semibold text-lg">
                      {formatNaira(txn.totalAmount)} is locked in vault
                    </div>
                    <div className="text-vault-600 text-sm">Safe to prepare and ship this order</div>
                  </div>
                </div>
                <button
                  onClick={handleMarkShipped}
                  className="btn-primary flex items-center gap-2 flex-shrink-0"
                >
                  <Truck size={16} />
                  Mark as Shipped
                </button>
              </div>
            )}

            {txn.status === 'in_transit' && (
              <div className="rounded-2xl bg-purple-500/10 border border-purple-500/25 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center animate-pulse-slow">
                    <Truck size={22} className="text-purple-400" />
                  </div>
                  <div>
                    <div className="text-purple-300 font-display font-semibold text-lg">
                      Order is in transit
                    </div>
                    <div className="text-purple-600 text-sm">
                      Shipped {txn.shippedAt ? formatDate(txn.shippedAt) : ''}. Awaiting buyer QR scan.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/scan')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-sm font-medium"
                >
                  <QrCode size={16} />
                  Ready to Scan
                </button>
              </div>
            )}

            {txn.status === 'released' && (
              <div className="rounded-2xl bg-vault-500/10 border border-vault-500/25 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-vault-500/20 flex items-center justify-center">
                  <Zap size={22} className="text-vault-400" />
                </div>
                <div>
                  <div className="text-vault-300 font-display font-semibold text-lg">Funds released!</div>
                  <div className="text-vault-600 text-sm">
                    {formatNaira(vendorReceives)} sent to your GTBank account · {txn.releasedAt ? formatDate(txn.releasedAt) : ''}
                  </div>
                </div>
              </div>
            )}

            {txn.status === 'disputed' && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/25 p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle size={22} className="text-red-400" />
                  </div>
                  <div>
                    <div className="text-red-300 font-display font-semibold text-lg">Dispute raised by buyer</div>
                    <div className="text-red-700 text-sm">Funds remain locked pending mediation</div>
                  </div>
                </div>
                {txn.dispute && (
                  <div className="bg-red-500/5 rounded-xl p-4 text-sm">
                    <div className="text-red-400 font-medium mb-1">{txn.dispute.reason}</div>
                    <div className="text-ink-400">{txn.dispute.description}</div>
                    <div className="text-ink-600 text-xs mt-2">
                      Raised {formatDate(txn.dispute.createdAt)} · Status: {txn.dispute.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Escrow link */}
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white mb-4 text-sm">Payment Link</h3>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-900 border border-white/5">
                <div className="flex-1 font-mono text-sm text-vault-400 truncate">{txn.escrowLink}</div>
                <button onClick={copyLink} className="text-ink-500 hover:text-white transition-colors flex-shrink-0">
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* Order breakdown */}
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white mb-5 text-sm">Order Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Item amount</span>
                  <span className="text-white font-mono">{formatNaira(txn.itemAmount)}</span>
                </div>
                {txn.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Delivery fee</span>
                    <span className="text-white font-mono">{formatNaira(txn.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Buyer pays total</span>
                  <span className="text-white font-mono font-medium">{formatNaira(txn.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                  <span className="text-ink-500">Platform fee (1.5%)</span>
                  <span className="text-red-400 font-mono">− {formatNaira(txn.platformFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vault-400 font-semibold">You receive</span>
                  <span className="text-vault-400 font-mono font-bold text-base">{formatNaira(vendorReceives)}</span>
                </div>
              </div>
            </div>

            {/* Delivery verification — vendor sees process, not the PIN */}
            {['funded', 'in_transit', 'disputed'].includes(txn.status) && (
              <div className="card p-6 border-amber-400/10">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode size={16} className="text-amber-400" />
                  <h3 className="font-display font-semibold text-white text-sm">Delivery Verification</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-ink-900 border border-white/5">
                    <div className="label mb-2">QR Scan</div>
                    <div className="text-white text-sm">Buyer shows QR on their phone. You scan it to release funds.</div>
                  </div>
                  <div className="p-4 rounded-xl bg-ink-900 border border-white/5">
                    <div className="label mb-2">Backup PIN</div>
                    <div className="text-ink-400 text-sm">
                      If buyer has no internet, ask them to read you their 4-digit PIN from their VouchPay screen.
                    </div>
                  </div>
                </div>
                {txn.status === 'in_transit' && (
                  <button
                    onClick={() => navigate('/scan')}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <QrCode size={16} />
                    Open Scanner to Release Funds
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            {txn.notes && (
              <div className="card p-6">
                <div className="label mb-2">Order Notes</div>
                <p className="text-ink-300 text-sm">{txn.notes}</p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Buyer info */}
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white mb-4 text-sm">Buyer</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {txn.buyer.name[0]}
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{txn.buyer.name}</div>
                  <div className="text-ink-500 text-xs">{txn.buyer.phone}</div>
                </div>
              </div>
              <div className="space-y-2">
                <a
                  href={`tel:${txn.buyer.phone}`}
                  className="flex items-center gap-2 text-ink-400 hover:text-white transition-colors text-sm p-2 rounded-lg hover:bg-white/5"
                >
                  <Phone size={14} />
                  {txn.buyer.phone}
                </a>
                {txn.buyer.email && (
                  <a
                    href={`mailto:${txn.buyer.email}`}
                    className="flex items-center gap-2 text-ink-400 hover:text-white transition-colors text-sm p-2 rounded-lg hover:bg-white/5"
                  >
                    <Mail size={14} />
                    {txn.buyer.email}
                  </a>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white mb-5 text-sm">Timeline</h3>
              <div className="space-y-0">
                {timelineSteps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.done
                          ? 'bg-vault-500/20 text-vault-400 border border-vault-500/30'
                          : 'bg-white/5 text-ink-600 border border-white/10'
                      }`}>
                        {step.icon}
                      </div>
                      {i < timelineSteps.length - 1 && (
                        <div className={`w-px flex-1 my-1 ${step.done ? 'bg-vault-500/30' : 'bg-white/5'}`} style={{ minHeight: '20px' }} />
                      )}
                    </div>
                    <div className="pb-5 min-w-0">
                      <div className={`text-sm font-medium ${step.done ? 'text-white' : 'text-ink-600'}`}>
                        {step.label}
                      </div>
                      {step.time && (
                        <div className="text-ink-600 text-xs mt-0.5">{formatDate(step.time)}</div>
                      )}
                      {!step.done && step.highlight && (
                        <div className="text-amber-400 text-xs mt-0.5">Awaiting buyer payment</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scan location (if delivered) */}
            {txn.qrScannedAt && txn.qrScanLocation && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-vault-400" />
                  <h3 className="font-display font-semibold text-white text-sm">Scan Location</h3>
                </div>
                <div className="text-ink-400 text-sm font-mono">
                  {txn.qrScanLocation.lat.toFixed(6)}, {txn.qrScanLocation.lng.toFixed(6)}
                </div>
                <div className="text-ink-600 text-xs mt-1">{formatDate(txn.qrScannedAt)}</div>
                <div className="text-vault-600 text-xs mt-0.5">GPS-verified delivery confirmation</div>
              </div>
            )}

            {/* Actions */}
            {txn.status !== 'released' && txn.status !== 'refunded' && txn.status !== 'cancelled' && (
              <div className="card p-4 space-y-2">
                <h3 className="font-display font-semibold text-white mb-2 text-sm px-2">Actions</h3>
                {txn.status === 'pending_payment' && (
                  <button onClick={copyLink} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 text-ink-400 hover:text-white transition-colors text-sm">
                    <span className="flex items-center gap-2"><Copy size={14} /> Resend payment link</span>
                    <ChevronRight size={14} />
                  </button>
                )}
                <button onClick={handleRaiseDispute} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-ink-500 hover:text-red-400 transition-colors text-sm">
                  <span className="flex items-center gap-2"><AlertTriangle size={14} /> Raise a dispute</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}