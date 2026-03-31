import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Eye, EyeOff, CheckCircle2, Building2, Phone, Mail, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'signup' | 'admin';

export default function VendorAuthPage() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // ── Login form state ──────────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // ── Signup form state — fully controlled ─────────────────────────────────
  const [signupForm, setSignupForm] = useState({
    name: '',
    phone: '',
    businessName: '',
    email: '',
    instagram: '',
    password: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    if (mode === 'admin') {
      login('admin');
      toast.success('Welcome, Mediator!');
      navigate('/admin');
    } else {
      // For login, rehydrate from whatever was saved (no new vendor object needed)
      login('vendor');
      toast.success(`Welcome back!`);
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.phone || !signupForm.businessName || !signupForm.email || !signupForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    setStep(2);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.bankName || !signupForm.accountNumber || !signupForm.accountName) {
      toast.error('Please fill in all bank details');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));

    // Pass the real form data so context stores this vendor, not Ada
    login('vendor', {
      name: signupForm.name,
      businessName: signupForm.businessName,
      email: signupForm.email,
      phone: signupForm.phone,
      instagramHandle: signupForm.instagram || undefined,
      whatsappNumber: signupForm.phone,
      bankName: signupForm.bankName,
      accountNumber: signupForm.accountNumber,
      accountName: signupForm.accountName,
    });

    // New account starts with zero transactions — clear mock data
    toast.success(`Account created! Welcome to VouchPay 🎉`);
    navigate('/dashboard');
    setLoading(false);
  };

  const banks = ['GTBank', 'Access Bank', 'First Bank', 'Zenith Bank', 'UBA', 'Opay', 'Palmpay', 'Kuda', 'Sterling Bank', 'Polaris Bank'];

  return (
    <div className="min-h-screen bg-ink-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-ink-900 to-ink-950 border-r border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-vault-500/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-500/5 blur-[80px]" />

        <div className="relative flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-vault-500 flex items-center justify-center">
            <Shield size={16} className="text-ink-950" />
          </div>
          <span className="font-display font-bold text-white text-lg">VouchPay</span>
        </div>

        <div className="relative">
          <div className="text-6xl mb-8">🔐</div>
          <h2 className="font-display font-bold text-4xl text-white mb-4 leading-tight">
            Your vault.<br />Your rules.
          </h2>
          <p className="text-ink-400 leading-relaxed mb-10">
            Every transaction you create is protected by cryptographic escrow.
            No chargebacks. No fake buyers. No bad faith.
          </p>
          <div className="space-y-4">
            {[
              { icon: '⚡', text: 'Instant payouts on QR scan' },
              { icon: '🛡️', text: 'Funds locked until delivery confirmed' },
              { icon: '📊', text: 'Real-time dashboard and analytics' },
              { icon: '💬', text: 'WhatsApp notifications built-in' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-ink-300">
                <span className="text-lg">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-ink-600 text-sm">Secured by Paystack · Licensed by CBN</div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-ink-500 hover:text-white transition-colors text-sm mb-8"
          >
            <ArrowLeft size={16} />
            Back to home
          </button>

          {/* Mode tabs */}
          <div className="flex rounded-xl bg-ink-900 p-1 mb-8 border border-white/5">
            {(['login', 'signup', 'admin'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setStep(1); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m ? 'bg-white/10 text-white' : 'text-ink-500 hover:text-ink-300'
                }`}
              >
                {m === 'admin' ? 'Admin' : m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* ── Login ── */}
          {(mode === 'login' || mode === 'admin') && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-1">
                  {mode === 'admin' ? 'Admin Access' : 'Welcome back'}
                </h1>
                <p className="text-ink-500 text-sm">
                  {mode === 'admin' ? 'Mediator portal access' : 'Sign in to your vendor account'}
                </p>
              </div>

              <div>
                <label className="label block mb-2">Email address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label block mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-12"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading
                  ? <div className="w-5 h-5 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
                  : mode === 'admin' ? 'Access Admin Portal' : 'Sign in'
                }
              </button>

              {mode === 'login' && (
                <div className="text-center">
                  <a href="#" className="text-vault-400 text-sm hover:text-vault-300 transition-colors">
                    Forgot password?
                  </a>
                </div>
              )}
            </form>
          )}

          {/* ── Sign Up ── */}
          {mode === 'signup' && (
            <div className="space-y-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-1">
                  {step === 1 ? 'Create your account' : 'Bank details'}
                </h1>
                <p className="text-ink-500 text-sm">
                  {step === 1 ? 'Step 1 of 2 — Personal information' : 'Step 2 of 2 — Where to send your money'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="flex gap-2">
                {[1, 2].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-vault-500' : 'bg-white/10'}`} />
                ))}
              </div>

              {/* Step 1 */}
              {step === 1 && (
                <form onSubmit={handleSignupStep1} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label block mb-2">Full name *</label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                        <input
                          className="input-field pl-10"
                          placeholder="Your full name"
                          value={signupForm.name}
                          onChange={e => setSignupForm({ ...signupForm, name: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label block mb-2">Phone *</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                        <input
                          className="input-field pl-10"
                          placeholder="0801 234 5678"
                          value={signupForm.phone}
                          onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label block mb-2">Business / Store name *</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                      <input
                        className="input-field pl-10"
                        placeholder="Your store name"
                        value={signupForm.businessName}
                        onChange={e => setSignupForm({ ...signupForm, businessName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label block mb-2">Email address *</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                      <input
                        type="email"
                        className="input-field pl-10"
                        placeholder="you@example.com"
                        value={signupForm.email}
                        onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label block mb-2">Instagram handle (optional)</label>
                    <input
                      className="input-field"
                      placeholder="@yourstorename"
                      value={signupForm.instagram}
                      onChange={e => setSignupForm({ ...signupForm, instagram: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label block mb-2">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input-field pr-12"
                        placeholder="Min. 8 characters"
                        value={signupForm.password}
                        onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                        minLength={8}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full py-4">
                    Continue to bank details →
                  </button>
                </form>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div>
                    <label className="label block mb-2">Bank name *</label>
                    <select
                      className="input-field"
                      value={signupForm.bankName}
                      onChange={e => setSignupForm({ ...signupForm, bankName: e.target.value })}
                      required
                    >
                      <option value="">Select your bank</option>
                      {banks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="label block mb-2">Account number *</label>
                    <input
                      className="input-field font-mono tracking-widest"
                      placeholder="0123456789"
                      maxLength={10}
                      value={signupForm.accountNumber}
                      onChange={e => setSignupForm({ ...signupForm, accountNumber: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>

                  <div>
                    <label className="label block mb-2">Account name *</label>
                    <input
                      className="input-field"
                      placeholder="As it appears on your bank account"
                      value={signupForm.accountName}
                      onChange={e => setSignupForm({ ...signupForm, accountName: e.target.value.toUpperCase() })}
                      required
                    />
                    <p className="text-ink-600 text-xs mt-1">This must match your bank account exactly</p>
                  </div>

                  <div className="p-4 rounded-xl bg-vault-500/5 border border-vault-500/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-vault-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-ink-300">
                        Your bank details are encrypted and only used for payouts via Paystack.
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn-secondary flex-1 py-4"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {loading
                        ? <div className="w-5 h-5 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
                        : 'Create Account'
                      }
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}