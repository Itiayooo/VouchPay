import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Building2, Phone, Mail, Instagram,
  CreditCard, Edit3, Save, X, CheckCircle2, Shield,
} from 'lucide-react';
import VendorSidebar from '../components/layout/VendorSidebar';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils';
import toast from 'react-hot-toast';

export default function VendorProfilePage() {
  const navigate = useNavigate();
  const { vendor, updateVendorProfile } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    businessName: vendor?.businessName ?? '',
    phone: vendor?.phone ?? '',
    instagramHandle: vendor?.instagramHandle ?? '',
    whatsappNumber: vendor?.whatsappNumber ?? '',
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.businessName.trim() || !form.phone.trim()) {
      toast.error('Name, business name and phone are required');
      return;
    }
    updateVendorProfile({
      name: form.name.trim(),
      businessName: form.businessName.trim(),
      phone: form.phone.trim(),
      instagramHandle: form.instagramHandle.trim() || undefined,
      whatsappNumber: form.whatsappNumber.trim() || undefined,
    });
    setEditing(false);
    toast.success('Profile updated!');
  };

  const handleCancel = () => {
    setForm({
      name: vendor?.name ?? '',
      businessName: vendor?.businessName ?? '',
      phone: vendor?.phone ?? '',
      instagramHandle: vendor?.instagramHandle ?? '',
      whatsappNumber: vendor?.whatsappNumber ?? '',
    });
    setEditing(false);
  };

  if (!vendor) return null;

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <VendorSidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-ink-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-2xl text-white">Your Profile</h1>
            <p className="text-ink-500 text-sm">Manage your account and business details</p>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit3 size={15} />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleCancel} className="btn-secondary flex items-center gap-2 text-sm">
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={15} /> Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main details */}
          <div className="col-span-2 space-y-6">

            {/* Identity */}
            <div className="card p-6">
              <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
                <User size={16} className="text-vault-400" />
                Personal Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-2">Full name</label>
                    {editing ? (
                      <input
                        className="input-field"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                      />
                    ) : (
                      <div className="text-white">{vendor.name}</div>
                    )}
                  </div>
                  <div>
                    <label className="label block mb-2">Email address</label>
                    <div className="text-white flex items-center gap-2">
                      {vendor.email}
                      {vendor.emailVerified && (
                        <span className="text-xs text-vault-400 flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-ink-600 text-xs mt-1">Email cannot be changed</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-2">Phone number</label>
                    {editing ? (
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                        <input
                          className="input-field pl-10"
                          value={form.phone}
                          onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="text-white flex items-center gap-2">
                        <Phone size={14} className="text-ink-500" />
                        {vendor.phone}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label block mb-2">WhatsApp number</label>
                    {editing ? (
                      <input
                        className="input-field"
                        placeholder="+2348012345678"
                        value={form.whatsappNumber}
                        onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                      />
                    ) : (
                      <div className="text-white">{vendor.whatsappNumber || <span className="text-ink-600">Not set</span>}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business */}
            <div className="card p-6">
              <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
                <Building2 size={16} className="text-vault-400" />
                Business Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label block mb-2">Business / Store name</label>
                  {editing ? (
                    <div className="relative">
                      <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                      <input
                        className="input-field pl-10"
                        value={form.businessName}
                        onChange={e => setForm({ ...form, businessName: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="text-white flex items-center gap-2">
                      <Building2 size={14} className="text-ink-500" />
                      {vendor.businessName}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label block mb-2">Instagram handle</label>
                  {editing ? (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 text-sm">@</span>
                      <input
                        className="input-field pl-8"
                        placeholder="yourstorename"
                        value={form.instagramHandle?.replace('@', '')}
                        onChange={e => setForm({ ...form, instagramHandle: `@${e.target.value.replace('@', '')}` })}
                      />
                    </div>
                  ) : (
                    <div className="text-white flex items-center gap-2">
                      <Instagram size={14} className="text-ink-500" />
                      {vendor.instagramHandle || <span className="text-ink-600">Not set</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bank details — read-only, contact support to change */}
            <div className="card p-6">
              <h2 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
                <CreditCard size={16} className="text-vault-400" />
                Bank Account
              </h2>
              <p className="text-ink-600 text-xs mb-5">To update bank details, contact support@vouchpay.ng</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Bank</span>
                  <span className="text-white">{vendor.bankName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Account number</span>
                  <span className="text-white font-mono">
                    {'•'.repeat(6)}{vendor.accountNumber.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Account name</span>
                  <span className="text-white">{vendor.accountName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: stats card */}
          <div className="space-y-6">
            {/* Avatar / badge */}
            <div className="card p-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                {vendor.name[0].toUpperCase()}
              </div>
              <div className="font-display font-bold text-white text-lg mb-0.5">{vendor.businessName}</div>
              <div className="text-ink-500 text-sm mb-3">{vendor.email}</div>
              {vendor.verified ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vault-500/10 border border-vault-500/20 text-vault-400 text-xs font-medium">
                  <Shield size={12} />
                  Verified Vendor
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-medium">
                  Pending Verification
                </div>
              )}
            </div>

            {/* Account stats */}
            <div className="card p-6 space-y-4">
              <h3 className="font-display font-semibold text-white text-sm">Account Stats</h3>
              <div className="space-y-3">
                {[
                  { label: 'Member since', value: formatDate(vendor.joinedAt ?? new Date()) },
                  { label: 'Total orders', value: vendor.totalTransactions.toString() },
                  { label: 'Rating', value: `⭐ ${vendor.rating.toFixed(1)} / 5.0` },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-ink-500">{s.label}</span>
                    <span className="text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Change password */}
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white text-sm mb-3">Security</h3>
              <button className="w-full btn-secondary text-sm py-2.5">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}