import { useNavigate } from 'react-router-dom';
import { Shield, QrCode, Zap, ArrowRight, Lock, CheckCircle2, AlertTriangle, Star, TrendingUp, Users } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const steps = [
    {
      n: '01',
      icon: <Shield size={22} />,
      title: 'Vendor Creates Escrow Link',
      desc: 'Set item price + delivery fee. Share the secure link with your buyer via DM.',
      color: 'text-vault-400',
    },
    {
      n: '02',
      icon: <Lock size={22} />,
      title: 'Buyer Pays Into Vault',
      desc: 'Funds are held securely. You get notified: "₦50,000 locked. Safe to ship."',
      color: 'text-blue-400',
    },
    {
      n: '03',
      icon: <QrCode size={22} />,
      title: 'QR Code Generated',
      desc: 'A unique one-time QR code is sent to the buyer. Only they can trigger release.',
      color: 'text-purple-400',
    },
    {
      n: '04',
      icon: <Zap size={22} />,
      title: 'Scan = Instant Payout',
      desc: 'Buyer shows QR, vendor scans it. Money hits your account before the rider leaves.',
      color: 'text-amber-400',
    },
  ];

  const problems = [
    {
      scenario: 'Vendor says they delivered but didn\'t',
      fix: 'No QR scan = No money. Simple.',
      icon: '🚫',
    },
    {
      scenario: 'Buyer claims "I never got it"',
      fix: 'GPS timestamp proves the scan happened at their location.',
      icon: '📍',
    },
    {
      scenario: 'Buyer\'s phone is dead',
      fix: 'Every order has a 4-digit backup PIN for manual release.',
      icon: '🔢',
    },
    {
      scenario: 'Buyer unhappy with item',
      fix: 'Refuse to scan → Raise Dispute → Mediator steps in. Funds stay locked.',
      icon: '⚖️',
    },
  ];

  const stats = [
    { value: '₦2.4B+', label: 'Secured in escrow' },
    { value: '18,000+', label: 'Successful deliveries' },
    { value: '0.8%', label: 'Dispute rate' },
    { value: '< 30s', label: 'Payout speed' },
  ];

  return (
    <div className="min-h-screen bg-ink-950 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-vault-500 flex items-center justify-center">
            <Shield size={16} className="text-ink-950" />
          </div>
          <span className="font-display font-bold text-white text-lg">VouchPay</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-ink-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#edge-cases" className="hover:text-white transition-colors">Trust & Safety</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-ink-400 hover:text-white transition-colors px-4 py-2"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="btn-primary text-sm px-5 py-2.5"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-6">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-vault-500/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/3 blur-[100px]" />
          <div className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full bg-purple-500/3 blur-[80px]" />
          
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-vault-500/30 bg-vault-500/10 text-vault-400 text-sm font-medium mb-8 animate-fade-up">
            <Shield size={14} />
            <span>Nigeria's #1 Social Commerce Escrow</span>
          </div>

          <h1 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl text-white leading-[1.05] mb-8 animate-fade-up animate-delay-100">
            Ship with{' '}
            <span className="text-gradient-vault">confidence.</span>
            <br />
            Pay with{' '}
            <span className="text-gradient-gold">peace.</span>
          </h1>

          <p className="text-lg md:text-xl text-ink-400 max-w-2xl mx-auto leading-relaxed mb-12 animate-fade-up animate-delay-200">
            VouchPay is a QR-verified escrow for Instagram and WhatsApp vendors.
            Money only moves when the buyer physically confirms delivery — protecting both sides of every deal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animate-delay-300">
            <button
              onClick={() => navigate('/auth')}
              className="btn-primary flex items-center gap-2 text-base px-8 py-4 w-full sm:w-auto"
            >
              Start as a Vendor
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/pay/demo')}
              className="btn-secondary flex items-center gap-2 text-base px-8 py-4 w-full sm:w-auto"
            >
              <QrCode size={18} />
              See Buyer Experience
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 mt-10 text-sm text-ink-500 animate-fade-up animate-delay-400">
            <div className="flex -space-x-2">
              {['A', 'C', 'E', 'F', 'T'].map((l, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-vault-600 to-vault-800 border-2 border-ink-950 flex items-center justify-center text-white text-xs font-bold">
                  {l}
                </div>
              ))}
            </div>
            <span>Trusted by <strong className="text-ink-300">18,000+</strong> vendors & buyers across Nigeria</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative px-6 py-16 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display font-bold text-3xl md:text-4xl text-white mb-1">{stat.value}</div>
              <div className="text-ink-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-ink-400 text-xs font-medium mb-4">
              THE VOUCHPAY FLOW
            </div>
            <h2 className="section-title text-4xl md:text-5xl mb-4">
              Four steps to a<br />
              <span className="text-gradient-vault">fraud-free deal</span>
            </h2>
            <p className="text-ink-400 max-w-lg mx-auto">
              Every transaction is protected end-to-end. The QR code is the key — no scan, no money, no exceptions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className="card glass-hover p-8 group"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${step.color} group-hover:border-current/30 transition-colors`}>
                      {step.icon}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-mono font-medium ${step.color} mb-2`}>{step.n}</div>
                    <h3 className="font-display font-semibold text-white text-lg mb-2">{step.title}</h3>
                    <p className="text-ink-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Visual Demo */}
      <section className="relative px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="card vault-border vault-glow overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left - QR visual */}
              <div className="p-12 flex flex-col items-center justify-center bg-gradient-to-br from-vault-500/5 to-transparent">
                <div className="relative">
                  <div className="w-48 h-48 rounded-3xl bg-white p-4 shadow-2xl">
                    {/* QR code illustration */}
                    <div className="w-full h-full grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 49 }).map((_, i) => {
                        const isCorner = (
                          (i < 7 && (i < 3 || i > 3)) ||
                          (i >= 42 && i < 49 && (i < 45 || i > 45)) ||
                          (i % 7 === 0 && (Math.floor(i/7) < 3 || Math.floor(i/7) > 3)) ||
                          (i % 7 === 6 && Math.floor(i/7) < 3)
                        );
                        const filled = isCorner || Math.random() > 0.5;
                        return (
                          <div
                            key={i}
                            className={`rounded-sm ${filled ? 'bg-ink-900' : 'bg-transparent'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  {/* Scan animation */}
                  <div className="absolute inset-0 flex items-start justify-center overflow-hidden rounded-3xl">
                    <div
                      className="w-full h-0.5 bg-vault-400/60 animate-scan-line"
                      style={{ boxShadow: '0 0 8px rgba(34,197,94,0.8)' }}
                    />
                  </div>
                  {/* Corners */}
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-8 h-8`}>
                      <div className={`w-full h-full border-vault-400 ${
                        pos.includes('top') && pos.includes('left') ? 'border-t-2 border-l-2 rounded-tl-2xl' :
                        pos.includes('top') ? 'border-t-2 border-r-2 rounded-tr-2xl' :
                        pos.includes('left') ? 'border-b-2 border-l-2 rounded-bl-2xl' :
                        'border-b-2 border-r-2 rounded-br-2xl'
                      }`} />
                    </div>
                  ))}
                </div>
                <p className="text-vault-400 text-sm font-medium mt-6">One-time use • Expires on scan</p>
              </div>

              {/* Right - Info */}
              <div className="p-12 flex flex-col justify-center">
                <h3 className="font-display font-bold text-3xl text-white mb-4">
                  The QR is the key.<br />The scan is the contract.
                </h3>
                <p className="text-ink-400 leading-relaxed mb-8">
                  When your item arrives, inspect it carefully. Satisfied? Show your QR code. 
                  The vendor scans it — funds release instantly. Unhappy? Keep the QR. The money stays locked.
                </p>
                <div className="space-y-3">
                  {[
                    'QR code sent immediately after payment',
                    'GPS-stamped at time of scan',
                    '4-digit backup PIN if phone is dead',
                    'One-time use — cannot be reused',
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-ink-300">
                      <CheckCircle2 size={16} className="text-vault-400 flex-shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edge cases */}
      <section id="edge-cases" className="relative px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/5 text-amber-400 text-xs font-medium mb-4">
              <AlertTriangle size={12} />
              TRUST & SAFETY
            </div>
            <h2 className="section-title text-4xl md:text-5xl mb-4">
              We thought about<br />
              <span className="text-gradient-gold">every trick.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {problems.map((p, i) => (
              <div key={i} className="card p-6 glass-hover">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">{p.icon}</div>
                  <div>
                    <div className="text-ink-500 text-sm mb-1 line-through">{p.scenario}</div>
                    <div className="text-white font-medium">{p.fix}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative px-6 py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="section-title text-4xl mb-4">Simple, honest pricing</h2>
          <p className="text-ink-400 mb-12">No subscription. No hidden fees. Only pay when a deal closes.</p>
          
          <div className="card vault-border p-10 vault-glow">
            <div className="font-display font-bold text-6xl text-white mb-2">1.5%</div>
            <div className="text-vault-400 font-medium mb-1">Platform fee per transaction</div>
            <div className="text-ink-500 text-sm mb-8">Minimum fee: ₦150 per order</div>
            
            <div className="grid grid-cols-3 gap-6 py-8 border-t border-white/5">
              {[
                { label: '₦10,000 item', fee: '₦150' },
                { label: '₦50,000 item', fee: '₦750' },
                { label: '₦200,000 item', fee: '₦3,000' },
              ].map((ex, i) => (
                <div key={i} className="text-center">
                  <div className="text-ink-400 text-sm mb-1">{ex.label}</div>
                  <div className="text-vault-400 font-mono font-medium">{ex.fee} fee</div>
                </div>
              ))}
            </div>
            
            <button onClick={() => navigate('/auth')} className="btn-primary w-full text-base py-4 mt-2">
              Start for free — no setup cost
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative card overflow-hidden p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-vault-500/10 via-transparent to-blue-500/5" />
            <div className="relative">
              <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
                Stop losing money to bad-faith buyers.<br />
                Stop losing customers to fraud fears.
              </h2>
              <p className="text-ink-400 mb-8 max-w-lg mx-auto">
                Join thousands of vendors building trust and closing deals confidently on VouchPay.
              </p>
              <button onClick={() => navigate('/auth')} className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
                Create your first escrow link
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-vault-500 flex items-center justify-center">
              <Shield size={12} className="text-ink-950" />
            </div>
            <span className="font-display font-bold text-white text-sm">VouchPay</span>
          </div>
          <div className="text-ink-600 text-sm">
            © 2024 VouchPay. Secured by Paystack. Built for Nigerian commerce.
          </div>
          <div className="flex items-center gap-4 text-ink-500 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
