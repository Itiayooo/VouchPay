import { api } from './client';
import type { VendorStats } from './types';

export const getVendorStats = () => api<VendorStats>('/stats/vendor', { auth: true });