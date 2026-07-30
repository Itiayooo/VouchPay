import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';

// Pages
import LandingPage from './pages/LandingPage';
import VendorAuthPage from './pages/VendorAuthPage';
import VendorDashboard from './pages/VendorDashboard';
import CreateEscrowPage from './pages/CreateEscrowPage';
import VendorTransactionPage from './pages/VendorTransactionPage';
import VendorScanPage from './pages/VendorScanPage';
import VendorProfilePage from './pages/VendorProfilePage';
import BuyerPaymentPage from './pages/BuyerPaymentPage';
import BuyerQRPage from './pages/BuyerQRPage';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-ink-950">
          {/* Noise texture */}
          <div className="noise-overlay" />
          
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<VendorAuthPage />} />
            
            {/* Buyer flow - shared link */}
            <Route path="/pay/:reference" element={<BuyerPaymentPage />} />
            <Route path="/qr/:reference" element={<BuyerQRPage />} />
            
            {/* Vendor */}
            <Route path="/dashboard" element={<VendorDashboard />} />
            <Route path="/create" element={<CreateEscrowPage />} />
            <Route path="/transaction/:id" element={<VendorTransactionPage />} />
            <Route path="/scan" element={<VendorScanPage />} />
            <Route path="/profile" element={<VendorProfilePage />} />
            
            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a17',
              color: '#f8f7f4',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#0a0a08' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0a0a08' },
            },
          }}
        />
      </BrowserRouter>
    </AppProvider>
  );
}
