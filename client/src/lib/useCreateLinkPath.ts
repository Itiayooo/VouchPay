import { useAuth } from '../context/AuthContext';

// Signed-in vendors go straight to the form; everyone else signs up first
export function useCreateLinkPath() {
    const { vendor } = useAuth();
    return vendor ? '/orders/new' : '/register';
}