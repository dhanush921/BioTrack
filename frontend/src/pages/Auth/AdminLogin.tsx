import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { api } from '../../services/api';
import { Mail, Lock, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const approveUserId = searchParams.get('approveUser');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter administrator credentials.');
      return;
    }

    setLoading(true);
    try {
      // 1. Log in
      await login(email, password);
      
      // 2. Fetch profile to verify role
      const profile = await api.get('/auth/me');
      
      if (profile.role !== 'Administrator') {
        sessionStorage.removeItem('biotrack_token');
        toast.error('Access Denied: This portal is restricted to System Administrators.');
        setLoading(false);
        return;
      }

      toast.success('Admin Console Authenticated.');
      if (approveUserId) {
        navigate(`/admin?approveUser=${approveUserId}`);
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* High-security amber glow overlay */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-red-600/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md border border-amber-500/20 rounded-3xl bg-slate-900/60 backdrop-blur-xl shadow-2xl p-8 text-white z-10 animate-scale-up relative">
        <button
          onClick={() => navigate('/login')}
          className="absolute left-6 top-6 text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          User Portal
        </button>

        {/* Shield brand header */}
        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/10 mb-4">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">
            Admin Access Console
          </h2>
          <p className="text-slate-500 text-xs mt-1">Authorized Administrative Personnel Only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Admin Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hospital.com"
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-xs font-semibold text-slate-400">Admin Password</label>
              <Link to="/forgot-password" className="text-amber-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Verifying Authorization...' : 'Access Admin Panel'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 p-4 rounded-xl border border-red-500/10 bg-red-950/5 text-[10px] text-slate-500 leading-relaxed text-center">
          Warning: Unauthorized login attempts will be logged under audit trail security parameters.
        </div>
      </div>
    </div>
  );
};
