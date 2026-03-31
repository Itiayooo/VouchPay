import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, LogOut, AlertTriangle, CheckCircle2, Clock,
  Users, TrendingUp, Wallet, ChevronRight, Search,
  BarChart3, Scale, XCircle, MessageSquare, Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira, formatDate, getStatusColor, getStatusLabel } from '../utils';
import toast from 'react-hot-toast';

type AdminTab = 'overview' | 'disputes' | 'transactions';

interface MockDispute {
  id: string;
  reference: string;
  buyer: string;
  vendor: string;
  item: string;
  amount: number;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved_vendor' | 'resolved_buyer';
  raisedBy: 'buyer' | 'vendor';
  createdAt: Date;
}

const MOCK_DISPUTES: MockDispute[] = [
  {
    id: 'dsp_001',
    reference: 'VP-2024-D2ST5V',
    buyer: 'Tunde Adeyemi',
    vendor: 'Ada\'s Luxury Thrift',
    item: 'iPhone 15 Pro Max (256GB, Black Titanium)',
    amount: 19500000,
    reason: 'Item not as described',
    description: 'The phone was advertised as brand new but came with scratches on the screen. The box was also tampered with.',
    status: 'under_review',
    raisedBy: 'buyer',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
  },
  {
    id: 'dsp_002',
    reference: 'VP-2024-E8KL3P',
    buyer: 'Kemi Adeyinka',
    vendor: 'Lagos Sneaker Plug',
    item: 'Jordan 1 Retro High OG (Size 41)',
    amount: 8500000,
    reason: 'Wrong item delivered',
    description: 'I ordered a Chicago colorway but received the Bred colorway. The vendor insists they sent the right item.',
    status: 'open',
    raisedBy: 'buyer',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'dsp_003',
    reference: 'VP-2024-F1NM9Q',
    buyer: 'Bolu Olatunde',
    vendor: 'TechVault NG',
    item: 'MacBook Air M2 (8GB/256GB)',
    amount: 38000000,
    reason: 'Item not received',
    description: 'Rider called and said they delivered but I was home all day and nobody came. No photo evidence of delivery.',
    status: 'resolved_buyer',
    raisedBy: 'buyer',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { transactions, logout } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [selectedDispute, setSelectedDispute] = useState<MockDispute | null>(null);
  const [mediatorNote, setMediatorNote] = useState('');
  const [search, setSearch] = useState('');
  const [disputes, setDisputes] = useState(MOCK_DISPUTES);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out');
  };

  const resolveDispute = (disputeId: string, resolution: 'resolved_vendor' | 'resolved_buyer') => {
    setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: resolution } : d));
    setSelectedDispute(null);
    setMediatorNote('');
    const label = resolution === 'resolved_buyer' ? 'buyer (refund issued)' : 'vendor (funds released)';
    toast.success(`Dispute resolved in favour of ${label}`);
  };

  const platformStats = [
    {
      label: 'Total Volume (30d)',
      value: '₦847M',
      change: '+23%',
      up: true,
      icon: <Wallet size={18} />,
      color: 'text-vault-400',
      bg: 'bg-vault-400/10',
    },
    {
      label: 'Active Transactions',
      value: '1,284',
      change: '+8%',
      up: true,
      icon: <TrendingUp size={18} />,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Open Disputes',
      value: disputes.filter(d => d.status === 'open' || d.status === 'under_review').length.toString(),
      change: '-2 today',
      up: false,
      icon: <AlertTriangle size={18} />,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
    },
    {
      label: 'Registered Vendors',
      value: '5,841',
      change: '+142 this week',
      up: true,
      icon: <Users size={18} />,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
  ];

  const disputeStatusColor: Record<string, string> = {
    open: 'text-red-400 bg-red-400/10 border-red-400/20',
    under_review: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    resolved_vendor: 'text-vault-400 bg-vault-400/10 border-vault-400/20',
    resolved_buyer: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };
  const disputeStatusLabel: Record<string, string> = {
    open: 'Open',
    under_review: 'Under Review',
    resolved_vendor: 'Resolved → Vendor',
    resolved_buyer: 'Resolved → Buyer',
  };

  return (
    <div className="min-h-screen bg-ink-950 flex">
      {/* Admin sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-ink-900 border-r border-white/5 flex flex-col z-40">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <Scale size={16} className="text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-white text-sm">VouchPay Admin</div>
              <div className="text-ink-600 text-xs">Mediator Portal</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {([
            { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
            { id: 'disputes', label: 'Disputes', icon: <AlertTriangle size={16} />, badge: disputes.filter(d => ['open', 'under_review'].includes(d.status)).length },
            { id: 'transactions', label: 'All Transactions', icon: <TrendingUp size={16} /> },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === item.id
                  ? 'bg-white/10 text-white'
                  : 'text-ink-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </div>
              {'badge' in item && item.badge > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-ink-500 hover:text-red-400 hover:bg-red-400/5 transition-all text-sm"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="font-display font-bold text-2xl text-white mb-1">Platform Overview</h1>
              <p className="text-ink-500 text-sm">VouchPay health and activity metrics</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {platformStats.map((s, i) => (
                <div key={i} className="card p-6">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} mb-4`}>
                    {s.icon}
                  </div>
                  <div className="font-display font-bold text-2xl text-white mb-1">{s.value}</div>
                  <div className="label">{s.label}</div>
                  <div className={`text-xs mt-1 ${s.up ? 'text-vault-500' : 'text-red-500'}`}>{s.change}</div>
                </div>
              ))}
            </div>

            {/* Recent disputes needing attention */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-display font-semibold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  Disputes Needing Attention
                </h2>
                <button onClick={() => setTab('disputes')} className="text-ink-500 hover:text-white text-sm transition-colors flex items-center gap-1">
                  View all <ChevronRight size={14} />
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {disputes.filter(d => ['open', 'under_review'].includes(d.status)).map(d => (
                  <div key={d.id} className="px-6 py-4 hover:bg-white/2 transition-colors cursor-pointer group" onClick={() => { setSelectedDispute(d); setTab('disputes'); }}>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white text-sm font-medium truncate">{d.item}</span>
                          <span className={`status-badge text-xs ${disputeStatusColor[d.status]}`}>{disputeStatusLabel[d.status]}</span>
                        </div>
                        <div className="text-ink-500 text-xs">{d.reason} · {d.buyer} → {d.vendor} · {formatDate(d.createdAt)}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-white font-mono text-sm">{formatNaira(d.amount)}</div>
                        <div className="text-ink-600 text-xs">locked</div>
                      </div>
                      <ChevronRight size={16} className="text-ink-700 group-hover:text-ink-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform fee earnings */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Platform Revenue (30d)', value: '₦12.7M', sub: 'From 1.5% fees' },
                { label: 'Avg Transaction Value', value: '₦46,800', sub: 'Up from ₦41,200 last month' },
                { label: 'Dispute Resolution Rate', value: '98.1%', sub: 'Resolved within 24h' },
              ].map((m, i) => (
                <div key={i} className="card p-6">
                  <div className="label mb-2">{m.label}</div>
                  <div className="font-display font-bold text-2xl text-white mb-1">{m.value}</div>
                  <div className="text-ink-600 text-xs">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disputes tab */}
        {tab === 'disputes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-1">Dispute Management</h1>
                <p className="text-ink-500 text-sm">Review and resolve buyer/vendor disputes</p>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  className="input-field pl-9 py-2 text-sm w-64"
                  placeholder="Search disputes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className={`grid gap-6 ${selectedDispute ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* Dispute list */}
              <div className="card overflow-hidden">
                <div className="divide-y divide-white/5">
                  {disputes
                    .filter(d => !search || d.item.toLowerCase().includes(search.toLowerCase()) || d.buyer.toLowerCase().includes(search.toLowerCase()))
                    .map(d => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDispute(selectedDispute?.id === d.id ? null : d)}
                      className={`p-5 cursor-pointer transition-colors ${selectedDispute?.id === d.id ? 'bg-white/5' : 'hover:bg-white/2'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`status-badge text-xs ${disputeStatusColor[d.status]}`}>
                              {disputeStatusLabel[d.status]}
                            </span>
                            <span className="text-ink-600 text-xs font-mono">{d.reference}</span>
                          </div>
                          <div className="text-white text-sm font-medium mb-1 truncate">{d.item}</div>
                          <div className="text-red-400 text-xs mb-1">{d.reason}</div>
                          <div className="text-ink-500 text-xs">
                            {d.buyer} (buyer) · {d.vendor}
                          </div>
                          <div className="text-ink-600 text-xs mt-1">{formatDate(d.createdAt)}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-white font-mono text-sm font-medium">{formatNaira(d.amount)}</div>
                          <div className="text-ink-600 text-xs">at stake</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispute detail panel */}
              {selectedDispute && (
                <div className="card p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-semibold text-white">Dispute Review</h3>
                    <button onClick={() => setSelectedDispute(null)} className="text-ink-600 hover:text-white transition-colors">
                      <XCircle size={18} />
                    </button>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Reference</span>
                      <span className="text-white font-mono text-xs">{selectedDispute.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Amount at stake</span>
                      <span className="text-amber-400 font-mono font-bold">{formatNaira(selectedDispute.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Raised by</span>
                      <span className="text-white capitalize">{selectedDispute.raisedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Buyer</span>
                      <span className="text-white">{selectedDispute.buyer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Vendor</span>
                      <span className="text-white">{selectedDispute.vendor}</span>
                    </div>
                  </div>

                  <div>
                    <div className="label mb-2">Item</div>
                    <div className="text-white text-sm">{selectedDispute.item}</div>
                  </div>

                  <div>
                    <div className="label mb-2">Reason</div>
                    <div className="text-red-400 text-sm">{selectedDispute.reason}</div>
                  </div>

                  <div>
                    <div className="label mb-2">Buyer's description</div>
                    <div className="p-3 rounded-xl bg-ink-900 text-ink-300 text-sm leading-relaxed">
                      {selectedDispute.description}
                    </div>
                  </div>

                  {/* Mediator notes */}
                  {['open', 'under_review'].includes(selectedDispute.status) && (
                    <>
                      <div>
                        <label className="label block mb-2">Mediator notes (internal)</label>
                        <textarea
                          className="input-field resize-none"
                          rows={3}
                          placeholder="Document your review findings here…"
                          value={mediatorNote}
                          onChange={e => setMediatorNote(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="label">Resolution</div>
                        <button
                          onClick={() => resolveDispute(selectedDispute.id, 'resolved_buyer')}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors text-sm"
                        >
                          <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">Resolve in favour of Buyer</div>
                            <div className="text-blue-500 text-xs">Refund {formatNaira(selectedDispute.amount)} to buyer</div>
                          </div>
                        </button>
                        <button
                          onClick={() => resolveDispute(selectedDispute.id, 'resolved_vendor')}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-vault-500/10 border border-vault-500/20 text-vault-300 hover:bg-vault-500/20 transition-colors text-sm"
                        >
                          <Wallet size={16} className="text-vault-400 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">Resolve in favour of Vendor</div>
                            <div className="text-vault-600 text-xs">Release {formatNaira(selectedDispute.amount)} to vendor</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}

                  {['resolved_vendor', 'resolved_buyer'].includes(selectedDispute.status) && (
                    <div className={`p-4 rounded-xl text-sm ${selectedDispute.status === 'resolved_buyer' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' : 'bg-vault-500/10 border border-vault-500/20 text-vault-300'}`}>
                      <CheckCircle2 size={16} className="inline mr-2" />
                      {selectedDispute.status === 'resolved_buyer' ? 'Resolved in buyer\'s favour — refund issued.' : 'Resolved in vendor\'s favour — funds released.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Transactions tab */}
        {tab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-1">All Transactions</h1>
                <p className="text-ink-500 text-sm">Platform-wide escrow activity</p>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input className="input-field pl-9 py-2 text-sm w-64" placeholder="Search…" />
              </div>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-6 py-3 label">Reference</th>
                    <th className="text-left px-6 py-3 label">Item</th>
                    <th className="text-left px-6 py-3 label">Vendor</th>
                    <th className="text-left px-6 py-3 label">Amount</th>
                    <th className="text-left px-6 py-3 label">Status</th>
                    <th className="text-left px-6 py-3 label">Date</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-ink-400">{txn.reference}</td>
                      <td className="px-6 py-4 text-white text-sm max-w-[200px] truncate">{txn.itemDescription}</td>
                      <td className="px-6 py-4 text-ink-400 text-sm">{txn.vendor.businessName}</td>
                      <td className="px-6 py-4 text-white font-mono text-sm">{formatNaira(txn.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <span className={`status-badge text-xs ${getStatusColor(txn.status)}`}>
                          {getStatusLabel(txn.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-500 text-xs">{formatDate(txn.createdAt)}</td>
                      <td className="px-6 py-4">
                        <button className="text-ink-600 hover:text-white transition-colors">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
