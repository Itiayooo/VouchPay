import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function RequireAuth({ role }: { role?: 'admin' }) {
    const { vendor, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Spinner />;
    if (!vendor) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (role && vendor.role !== role) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}