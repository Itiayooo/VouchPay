import { api } from './client';
import type { Vendor } from './types';

export interface RegisterInput {
    name: string;
    businessName: string;
    email: string;
    password: string;
    phone: string;
    instagramHandle?: string;
    whatsappNumber?: string;
}

export interface Session {
    vendor: Vendor;
    accessToken: string;
    refreshToken: string;
}

export const register = (input: RegisterInput) =>
    api<Session>('/auth/register', { method: 'POST', body: input });

export const login = (email: string, password: string) =>
    api<Session>('/auth/login', { method: 'POST', body: { email, password } });

export const me = () => api<{ vendor: Vendor }>('/auth/me', { auth: true }).then((d) => d.vendor);

export const logout = () => api('/auth/logout', { method: 'POST', auth: true });

export const updateProfile = (input: Partial<Pick<Vendor, 'name' | 'businessName' | 'phone' | 'instagramHandle' | 'whatsappNumber'>>) =>
    api<{ vendor: Vendor }>('/auth/profile', { method: 'PUT', body: input, auth: true }).then((d) => d.vendor);