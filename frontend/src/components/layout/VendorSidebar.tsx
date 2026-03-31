import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Plus, QrCode, User, LogOut, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

const navItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard' },
  { icon: <Plus size={18} />, label: 'New Escrow', path: '/create' },
  { icon: <QrCode size={18} />, label: 'Scan QR', path: '/scan' },
  { icon: <User size={18} />, label: 'Profile', path: '/profile' },
];

export default function VendorSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendor, logout } = useApp();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-ink-900 border-r border-white/5 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-vault-500 flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-ink-950" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm">VouchPay</div>
            <div className="text-ink-600 text-xs">Vendor Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-vault-500/15 text-vault-400 border border-vault-500/20'
                  : 'text-ink-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </div>
              {active && <ChevronRight size={14} />}
            </button>
          );
        })}
      </nav>

      {/* Vendor info */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {vendor?.name?.[0] ?? 'V'}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{vendor?.businessName ?? 'Vendor'}</div>
            <div className="text-ink-500 text-xs truncate">{vendor?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-ink-500 hover:text-red-400 hover:bg-red-400/5 transition-all text-sm"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
