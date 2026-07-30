import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Clock, AlertTriangle, CheckCircle2, ChevronRight, Copy, ExternalLink, Wallet, ArrowUpRight } from 'lucide-react';
import VendorSidebar from '../components/layout/VendorSidebar';
import { useApp } from '../context/AppContext';
import { formatNaira, formatDate, getStatusColor, getStatusLabel } from '../utils';
import toast from 'react-hot-toast';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { vendor, transactions } = useApp();

  // Only show transactions belonging to the logged-in vendor
  const myTxns = transactions.filter(t => t.vendor.id === vendor?.id);

  // Compute stats live from actual transactions
  const totalEarned = myTxns
    .filter(t => t.status === 'released')
    .reduce((sum, t) => sum + (t.totalAmount - t.platformFee), 0);

  const pendingRelease = myTxns
    .filter(t => ['funded', 'in_transit'].includes(t.status))
    .reduce((sum, t) => sum + (t.totalAmount - t.platformFee), 0);

  const inTransitCount = myTxns.filter(t => t.status === 'in_transit').length;
  const activeCount = myTxns.filter(t => ['funded', 'in_transit'].includes(t.status)).length;
  const completedCount = myTxns.filter(t => t.status === 'released').length;
  const disputedCount = myTxns.filter(t => t.status === 'disputed').length;
  const disputeRate = myTxns.length > 0
    ? ((disputedCount / myTxns.length) * 100).toFixed(1)
    : '0.0';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    {
      label: 'Total Earned',
      value: formatNaira(totalEarned),
      sub: `${completedCount} completed order${completedCount !== 1 ? 's' : ''}`,
      icon: <Wallet size={20} />,
      color: 'text-vault-400',
      bg: 'bg-vault-400/10',
    },
    {
      label: 'Pending Release',
      value: formatNaira(pendingRelease),
      sub: `${activeCount} active order${activeCount !== 1 ? 's' : ''}`,
      icon: <Clock size={20} />,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
    {
      label: 'In Transit',
      value: `${inTransitCount} order${inTransitCount !== 1 ? 's' : ''}`,
      sub: 'Awaiting delivery',
      icon: <TrendingUp size={20} />,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Dispute Rate',
      value: `${disputeRate}%`,
      sub: 'Industry avg: 4.2%',
      icon: <AlertTriangle size={20} />,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
  ];

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <VendorSidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-2xl text-white mb-1">
              {getGreeting()}, {vendor?.name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="text-ink-500 text-sm">Here's what's happening with your escrows</p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Escrow Link
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className="card p-6 glass-hover">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color} mb-4`}>
                {card.icon}
              </div>
              <div className="font-display font-bold text-2xl text-white mb-1">{card.value}</div>
              <div className="label">{card.label}</div>
              <div className="text-ink-600 text-xs mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick action banner for funded orders */}
        {myTxns.filter(t => t.status === 'funded').length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-vault-500/10 border border-vault-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-vault-500/20 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-vault-400" />
              </div>
              <div>
                <div className="text-vault-300 font-medium text-sm">
                  {myTxns.filter(t => t.status === 'funded').length} order{myTxns.filter(t => t.status === 'funded').length > 1 ? 's' : ''} funded and ready to ship
                </div>
                <div className="text-vault-600 text-xs">Funds are locked in vault — safe to prepare shipment</div>
              </div>
            </div>
            <button
              onClick={() => {
                const funded = myTxns.find(t => t.status === 'funded');
                if (funded) navigate(`/transaction/${funded.id}`);
              }}
              className="text-vault-400 hover:text-vault-300 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              View <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Transactions */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">Recent Transactions</h2>
          </div>

          {myTxns.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="font-display font-semibold text-white mb-2">No escrows yet</h3>
              <p className="text-ink-500 text-sm mb-6">Create your first escrow link and share it with a buyer to get started.</p>
              <button onClick={() => navigate('/create')} className="btn-primary flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Create your first escrow
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {myTxns.map(txn => (
                <div
                  key={txn.id}
                  className="px-6 py-5 hover:bg-white/2 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/transaction/${txn.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      txn.status === 'released' ? 'bg-vault-500' :
                      txn.status === 'funded' ? 'bg-blue-500' :
                      txn.status === 'in_transit' ? 'bg-purple-500' :
                      txn.status === 'disputed' ? 'bg-red-500' :
                      'bg-ink-600'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="text-white font-medium text-sm truncate">{txn.itemDescription}</span>
                        <span className={`status-badge text-xs ${getStatusColor(txn.status)}`}>
                          {getStatusLabel(txn.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-ink-500">
                        <span className="font-mono">{txn.reference}</span>
                        <span>·</span>
                        <span>{txn.buyer.name}</span>
                        <span>·</span>
                        <span>{formatDate(txn.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-white font-mono font-medium text-sm">{formatNaira(txn.itemAmount)}</div>
                        <div className="text-ink-600 text-xs">+ {formatNaira(txn.deliveryFee)} delivery</div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(txn.escrowLink); toast.success('Link copied!'); }}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-ink-400 hover:text-white transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/transaction/${txn.id}`); }}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-ink-400 hover:text-white transition-colors"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>

                      <ChevronRight size={16} className="text-ink-700 group-hover:text-ink-400 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendor tip */}
        <div className="mt-6 p-4 rounded-xl border border-white/5 bg-white/2 flex items-start gap-3">
          <ArrowUpRight size={16} className="text-vault-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-ink-500">
            <span className="text-ink-300 font-medium">Pro tip:</span> Share your escrow link on Instagram stories for faster payment. Add "Pay safely via VouchPay 🔐" in your caption to build trust.
          </div>
        </div>
      </main>
    </div>
  );
}
