import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back to BioTrack!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Login credentials invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      toast.success('Welcome back to BioTrack!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Login credentials invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Ambient gradient backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md border border-white/10 rounded-3xl bg-slate-900/60 backdrop-blur-xl shadow-2xl p-8 text-white z-10 animate-scale-up">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-xl text-white shadow-lg mb-4">
            B
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Access BioTrack</h2>
          <p className="text-slate-400 text-sm mt-1">Biomedical Equipment Control Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <Link to="/forgot-password" className="text-xs text-cyan-400 hover:underline">
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
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4 text-xs text-slate-500">
          <div>
            Need an account?{' '}
            <Link to="/signup" className="text-cyan-400 hover:underline">
              Register here
            </Link>
          </div>
          
          <div className="w-full border-t border-white/5 pt-4 flex justify-center">
            <button
              onClick={() => navigate('/admin-login')}
              type="button"
              className="px-5 py-2 border border-amber-500/20 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/15 text-amber-400 hover:text-amber-300 font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/5"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
