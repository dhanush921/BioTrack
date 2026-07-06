import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Mail, Lock, Key, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Multi-step state: 'request' | 'verify' | 'completed'
  const [step, setStep] = useState<'request' | 'verify' | 'completed'>('request');
  const [userId, setUserId] = useState<string | null>(null);
  
  // OTP Verification states
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Debug helpers
  const [debugOtp, setDebugOtp] = useState('');

  // Submit email to request OTP code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setUserId(res.userId);
      if (res.debugOtp) {
        setDebugOtp(res.debugOtp);
      }
      
      toast.success('Verification code has been simulated.');
      setStep('verify');
    } catch (err: any) {
      toast.error(err.message || 'Verification request failed.');
    } finally {
      setLoading(false);
    }
  };

  // Submit OTP and new password to reset
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !otp || !newPassword) {
      toast.error('Please enter the verification code and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        userId,
        otp,
        newPassword
      });
      toast.success('Password updated successfully!');
      setStep('completed');
    } catch (err: any) {
      toast.error(err.message || 'Validation failed. Check verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-violet-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md border border-white/10 rounded-3xl bg-slate-900/60 backdrop-blur-xl shadow-2xl p-8 text-white z-10 animate-scale-up">
        
        {step !== 'completed' && (
          <Link to="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        )}

        {/* Step 1: Request OTP */}
        {step === 'request' && (
          <>
            <h2 className="text-2xl font-bold tracking-tight">Recover Password</h2>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Enter your email to receive a 6-digit verification code to reset your password.
            </p>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hospital.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? 'Generating Code...' : 'Send Verification Code'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Verify OTP & Enter New Password */}
        {step === 'verify' && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-cyan-400">Verify Code</h2>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              We have simulated sending an email. Enter the 6-digit OTP code below to confirm and apply your new password.
            </p>

            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              {/* OTP Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">6-Digit OTP Verification Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors tracking-widest font-semibold placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* New Password Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Choose New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? 'Resetting Password...' : 'Verify Code & Apply'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Debug Banner for Local Environment Testing */}
            {debugOtp && (
              <div className="mt-6 p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 text-xs space-y-1">
                <span className="font-semibold text-amber-300 block">Developer Test Alert:</span>
                <p className="text-slate-400 leading-relaxed">
                  Since the project runs locally without an active mail server, the code was outputted to the server command shell.
                </p>
                <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-white/5 mt-2">
                  <span className="text-slate-500">Copy Code:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm tracking-wider select-all">
                    {debugOtp}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 3: Success Screen */}
        {step === 'completed' && (
          <div className="text-center py-6 space-y-5 animate-scale-up">
            <div className="flex justify-center">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Password Reset Complete</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your credentials have been successfully updated. You can now authenticate your session.
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/10 hover:opacity-95 transition-opacity"
            >
              Proceed to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
