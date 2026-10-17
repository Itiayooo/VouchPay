import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { tokens } from '../api/client';
import type { Vendor } from '../api/types';

interface AuthValue {
    vendor: Vendor | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (input: authApi.RegisterInput) => Promise<void>;
    logout: () => Promise<void>;
    setVendor: (vendor: Vendor) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(Boolean(tokens.access || tokens.refresh));

    // Restore the session on app load
    useEffect(() => {
        if (!tokens.access && !tokens.refresh) return;
        let cancelled = false;
        authApi
            .me()
            .then((v) => {
                if (!cancelled) setVendor(v);
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // The API client fires this when a session can't be refreshed
    useEffect(() => {
        const onLogout = () => setVendor(null);
        window.addEventListener('vp:logout', onLogout);
        return () => window.removeEventListener('vp:logout', onLogout);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const session = await authApi.login(email, password);
        tokens.set(session.accessToken, session.refreshToken);
        setVendor(session.vendor);
    }, []);

    const register = useCallback(async (input: authApi.RegisterInput) => {
        const session = await authApi.register(input);
        tokens.set(session.accessToken, session.refreshToken);
        setVendor(session.vendor);
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // clear locally even if the server can't be reached
        }
        tokens.clear();
        setVendor(null);
    }, []);

    const value = useMemo(
        () => ({ vendor, loading, login, register, logout, setVendor }),
        [vendor, loading, login, register, logout]
    );

    return <AuthContext.Provider value={ value }> { children } </AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}