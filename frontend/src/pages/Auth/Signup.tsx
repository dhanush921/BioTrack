import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { User, Mail, Lock, Building, UserCheck, ArrowRight } from 'lucide-react';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Department Staff');
  const [department, setDepartment] = useState('Biomedical Engineering');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name, role, department);
      toast.success('Registration successful! Session initialized.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md border border-white/10 rounded-3xl bg-slate-900/60 backdrop-blur-xl shadow-2xl p-8 text-white z-10 animate-scale-up">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-xl text-white shadow-lg mb-4">
            B
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create BioTrack Account</h2>
          <p className="text-slate-400 text-sm mt-1">Register for hospital equipment management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcus Chen"
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mchen@hospital.com"
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Department dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Department</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-white/5 bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none"
              >
                <option value="Biomedical Engineering">Biomedical</option>
                <option value="Radiology">Radiology</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Obstetrics & Gynecology">OB/GYN</option>
                <option value="ICU">ICU</option>
                <option value="OR">Operating Room</option>
              </select>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};
