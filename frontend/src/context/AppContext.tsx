import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EscrowTransaction, Vendor, UserRole } from '../types';
import { MOCK_VENDOR, MOCK_TRANSACTIONS } from '../utils';

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'vouchpay_transactions';
const AUTH_KEY = 'vouchpay_auth';
const STORAGE_VERSION = '2'; // bump this to wipe stale data on breaking changes
const VERSION_KEY = 'vouchpay_version';

// Wipe old data if storage version doesn't match
if (localStorage.getItem(VERSION_KEY) !== STORAGE_VERSION) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(AUTH_KEY);
  localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
}

interface PersistedAuth {
  role: UserRole;
  vendor: Vendor | null;
}

const saveAuth = (role: UserRole, vendor: Vendor | null) => {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ role, vendor }));
  } catch { /* ignore */ }
};

const loadAuth = (): PersistedAuth | null => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearAuth = () => {
  try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
};

const saveTxns = (txns: EscrowTransaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
  } catch { /* storage full — silently skip */ }
};

const loadTxns = (): EscrowTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return []; // fresh install — no mock data pre-loaded
    const parsed = JSON.parse(raw) as EscrowTransaction[];
    return parsed.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt),
      expiresAt: new Date(t.expiresAt),
      paidAt: t.paidAt ? new Date(t.paidAt) : undefined,
      shippedAt: t.shippedAt ? new Date(t.shippedAt) : undefined,
      deliveredAt: t.deliveredAt ? new Date(t.deliveredAt) : undefined,
      releasedAt: t.releasedAt ? new Date(t.releasedAt) : undefined,
      qrScannedAt: t.qrScannedAt ? new Date(t.qrScannedAt) : undefined,
      dispute: t.dispute ? {
        ...t.dispute,
        createdAt: new Date(t.dispute.createdAt),
        resolvedAt: t.dispute.resolvedAt ? new Date(t.dispute.resolvedAt) : undefined,
      } : undefined,
    }));
  } catch {
    return [];
  }
};

// ─── Context types ────────────────────────────────────────────────────────────

interface AppState {
  currentRole: UserRole | null;
  vendor: Vendor | null;
  transactions: EscrowTransaction[];
  activeTransaction: EscrowTransaction | null;
  isAuthenticated: boolean;
}

interface AppContextType extends AppState {
  setCurrentRole: (role: UserRole | null) => void;
  setVendor: (vendor: Vendor | null) => void;
  setTransactions: (txns: EscrowTransaction[]) => void;
  setActiveTransaction: (txn: EscrowTransaction | null) => void;
  login: (role: UserRole, vendorData?: Partial<Vendor>) => void;
  logout: () => void;
  addTransaction: (txn: EscrowTransaction) => void;
  updateTransaction: (id: string, updates: Partial<EscrowTransaction>) => void;
  updateVendorProfile: (updates: Partial<Vendor>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Rehydrate auth from localStorage on first mount
  const persistedAuth = loadAuth();

  const [currentRole, setCurrentRole] = useState<UserRole | null>(persistedAuth?.role ?? null);
  const [vendor, setVendor] = useState<Vendor | null>(persistedAuth?.vendor ?? null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>(loadTxns);
  const [activeTransaction, setActiveTransaction] = useState<EscrowTransaction | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(persistedAuth !== null);

  // Persist transactions whenever they change
  useEffect(() => {
    saveTxns(transactions);
  }, [transactions]);

  const login = (role: UserRole, vendorData?: Partial<Vendor>) => {
    let v: Vendor | null = null;
    if (role === 'vendor') {
      // Merge supplied form data over MOCK_VENDOR as the base shape,
      // but clear out Ada's specific details so a new account starts fresh.
      v = vendorData
        ? {
            ...MOCK_VENDOR,
            ...vendorData,
            id: `v_${Date.now()}`,
            totalTransactions: 0,
            totalVolume: 0,
            rating: 5.0,
            verified: false,
          }
        : MOCK_VENDOR; // demo login with no form data falls back to mock
    }
    setCurrentRole(role);
    setIsAuthenticated(true);
    setVendor(v);
    saveAuth(role, v);
  };

  const updateVendorProfile = (updates: Partial<Vendor>) => {
    setVendor(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveAuth(currentRole!, updated);
      return updated;
    });
  };

  const logout = () => {
    setCurrentRole(null);
    setVendor(null);
    setIsAuthenticated(false);
    setActiveTransaction(null);
    clearAuth();
  };

  const addTransaction = (txn: EscrowTransaction) => {
    setTransactions(prev => [txn, ...prev]);
  };

  const updateTransaction = (id: string, updates: Partial<EscrowTransaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
    setActiveTransaction(prev =>
      prev?.id === id ? { ...prev, ...updates } : prev
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        vendor,
        transactions,
        activeTransaction,
        isAuthenticated,
        setCurrentRole,
        setVendor,
        setTransactions,
        setActiveTransaction,
        login,
        logout,
        addTransaction,
        updateTransaction,
        updateVendorProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};