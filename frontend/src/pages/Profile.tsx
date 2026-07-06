import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { GlassCard } from '../components/GlassCard';
import { 
  User, Mail, Building, Key, Shield, Bell,
  Save, RefreshCw
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [themePreference, setThemePreference] = useState(user?.themePreference || 'dark');
  
  // Notifications settings
  const [calibration, setCalibration] = useState(user?.notifications?.calibration ?? true);
  const [warranty, setWarranty] = useState(user?.notifications?.warranty ?? true);
  const [breakdowns, setBreakdowns] = useState(user?.notifications?.breakdowns ?? true);
  const [tasks, setTasks] = useState(user?.notifications?.tasks ?? true);

  // Password reset settings
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {
        name,
        department,
        themePreference,
        notifications: { calibration, warranty, breakdowns, tasks }
      };

      if (password) {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        updates.password = password;
      }

      await updateUser(updates);
      
      // Apply theme preference immediately
      if (themePreference === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }

      toast.success('Profile configurations updated.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Account Profile Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure individual specifications, notifications, and passwords.</p>
      </div>

      <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Avatar Card */}
        <div className="space-y-6">
          <GlassCard className="border-white/5 bg-slate-900/40 flex flex-col items-center p-6 text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-cyan-500/10 mb-4">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <h3 className="font-bold text-lg text-slate-200">{user?.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{user?.role}</p>
            <p className="text-[10px] text-cyan-400 font-mono mt-1">{user?.id}</p>

            <div className="w-full border-t border-white/5 mt-6 pt-4 space-y-2 text-xs text-slate-400 text-left">
              <div className="flex gap-2 items-center"><Mail className="w-3.5 h-3.5 text-slate-500" /> <span>{user?.email}</span></div>
              <div className="flex gap-2 items-center"><Building className="w-3.5 h-3.5 text-slate-500" /> <span>{user?.department}</span></div>
            </div>
          </GlassCard>

          {/* Theme selector */}
          <GlassCard className="border-white/5 bg-slate-900/40 space-y-3">
            <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Interface Theme</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-glass bg-slate-950/20 text-xs cursor-pointer hover:bg-slate-950/40 transition-colors">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={themePreference === 'dark'}
                  onChange={() => setThemePreference('dark')}
                  className="text-cyan-500 focus:ring-0"
                />
                <span>Dark Theme (Recommended)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-glass bg-slate-950/20 text-xs cursor-pointer hover:bg-slate-950/40 transition-colors">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={themePreference === 'light'}
                  onChange={() => setThemePreference('light')}
                  className="text-cyan-500 focus:ring-0"
                />
                <span>Light Theme</span>
              </label>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Inputs Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Metadata Card */}
          <GlassCard className="border-white/5 bg-slate-900/40 space-y-4">
            <h4 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2">Profile Specifications</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Department Alignment</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                >
                  <option value="Biomedical Engineering">Biomedical Engineering</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Obstetrics & Gynecology">OB/GYN</option>
                  <option value="ICU">ICU</option>
                  <option value="OR">Operating Room</option>
                </select>
              </div>
            </div>
          </GlassCard>

          {/* Notifications config */}
          <GlassCard className="border-white/5 bg-slate-900/40 space-y-4">
            <h4 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-cyan-400" />
              Alert Telemetry Reminders
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center justify-between p-3 border border-white/5 bg-slate-950/20 rounded-xl cursor-pointer hover:bg-slate-950/30 transition-colors">
                <span>Calibration Recalibration Alarms</span>
                <input
                  type="checkbox"
                  checked={calibration}
                  onChange={() => setCalibration(!calibration)}
                  className="rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-white/5 bg-slate-950/20 rounded-xl cursor-pointer hover:bg-slate-950/30 transition-colors">
                <span>Warranty Expiration Notices</span>
                <input
                  type="checkbox"
                  checked={warranty}
                  onChange={() => setWarranty(!warranty)}
                  className="rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-white/5 bg-slate-950/20 rounded-xl cursor-pointer hover:bg-slate-950/30 transition-colors">
                <span>Corrective Breakdown Alarms</span>
                <input
                  type="checkbox"
                  checked={breakdowns}
                  onChange={() => setBreakdowns(!breakdowns)}
                  className="rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-white/5 bg-slate-950/20 rounded-xl cursor-pointer hover:bg-slate-950/30 transition-colors">
                <span>PM Tasks Assignment Emails</span>
                <input
                  type="checkbox"
                  checked={tasks}
                  onChange={() => setTasks(!tasks)}
                  className="rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
              </label>
            </div>
          </GlassCard>

          {/* Password updates */}
          <GlassCard className="border-white/5 bg-slate-900/40 space-y-4">
            <h4 className="font-bold text-sm text-slate-200 border-b border-white/5 pb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-violet-400" />
              Adjust Credentials
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                />
              </div>
            </div>
          </GlassCard>

          {/* Form Actions */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile Options
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
