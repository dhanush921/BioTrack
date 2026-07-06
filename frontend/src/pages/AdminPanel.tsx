import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, Database, FileSpreadsheet, Key, Users, 
  Settings, RefreshCw, Upload, Download, Scroll, Eye, FileCode,
  UserPlus, X
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { GlassCard } from '../components/GlassCard';
import { TableSkeleton } from '../components/SkeletonLoader';

interface SystemLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  approved?: boolean;
}

export const AdminPanel: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'logs' | 'db' | 'docs'>('users');
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [apiDocs, setApiDocs] = useState<any>(null);

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Technician',
    department: 'Radiology'
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      toast.error('All fields are required.');
      return;
    }
    try {
      await api.post('/admin/users', newUserForm);
      toast.success(`Account for ${newUserForm.name} created.`);
      setUserFormOpen(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'Technician',
        department: 'Radiology'
      });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user account.');
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}`, { approved: true });
      toast.success('User account approved successfully.');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed.');
    }
  };

  const loadApiDocs = async () => {
    try {
      const data = await api.get('/admin/docs');
      setApiDocs(data);
    } catch (e) {
      toast.error('Failed to load API specifications.');
    }
  };

  useEffect(() => {
    if (activeSubTab === 'docs' && !apiDocs) {
      loadApiDocs();
    }
  }, [activeSubTab]);

  const loadUsers = async () => {
    try {
      const data = await api.get('/admin/users');
      setUsers(data);
    } catch (e) {
      toast.error('Failed to load user rosters.');
    }
  };

  const loadLogs = async () => {
    try {
      const data = await api.get('/admin/logs');
      setLogs(data);
    } catch (e) {
      toast.error('Failed to load system logs.');
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadLogs()]);
    
    // Auto-approve user query checks
    const approveUserId = searchParams.get('approveUser');
    if (approveUserId) {
      try {
        await api.put(`/admin/users/${approveUserId}`, { approved: true });
        toast.success('Access Request approved instantly via secure link!');
        
        // Reload users & logs
        await Promise.all([loadUsers(), loadLogs()]);
        
        // Clear search parameter
        searchParams.delete('approveUser');
        setSearchParams(searchParams);
      } catch (err) {
        console.error('Auto-approval error', err);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      toast.success('User privileges updated.');
      loadUsers();
      loadLogs();
    } catch (e) {
      toast.error('Failed to update privileges.');
    }
  };

  const handleUpdateDepartment = async (userId: string, newDept: string) => {
    try {
      await api.put(`/admin/users/${userId}`, { department: newDept });
      toast.success('User department alignment updated.');
      loadUsers();
      loadLogs();
    } catch (e) {
      toast.error('Failed to update department.');
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const res = await api.get('/admin/backup');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biotrack_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('System database dump downloaded.');
    } catch (e) {
      toast.error('Failed to trigger database backup.');
    }
  };

  const handleTriggerRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);

        setRestoring(true);
        await api.post('/admin/restore', backupData);
        toast.success('System database successfully restored!');
        initData();
      } catch (err: any) {
        toast.error('Restore failed: JSON schema mismatch.');
      } finally {
        setRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const subTabClasses = (tab: typeof activeSubTab) => `
    px-4 py-2 text-xs font-semibold rounded-lg transition-all border
    ${activeSubTab === tab 
      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold' 
      : 'border-transparent text-slate-400 hover:text-slate-200'}
  `;

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">System Admin Console</h1>
            <p className="text-slate-400 text-sm mt-1">Audit telemetry, adjust roles, and restore database nodes.</p>
          </div>
        </div>
      </div>

      {/* Sub menu controls */}
      <div className="flex gap-2 border-b border-white/5 pb-3">
        <button onClick={() => setActiveSubTab('users')} className={subTabClasses('users')}>
          <Users className="w-3.5 h-3.5 inline mr-1" />
          Roster Privileges
        </button>
        <button onClick={() => setActiveSubTab('logs')} className={subTabClasses('logs')}>
          <Scroll className="w-3.5 h-3.5 inline mr-1" />
          Audit Logs
        </button>
         <button onClick={() => setActiveSubTab('db')} className={subTabClasses('db')}>
          <Database className="w-3.5 h-3.5 inline mr-1" />
          Database Tools
        </button>
        <button onClick={() => setActiveSubTab('docs')} className={subTabClasses('docs')}>
          <FileCode className="w-3.5 h-3.5 inline mr-1" />
          REST API Docs
        </button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Sub Tab: Users privileges */}
          {activeSubTab === 'users' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-white/5 rounded-2xl">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">System Access Roster</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Define login roles and departments for staff members.</p>
                </div>
                <button
                  onClick={() => setUserFormOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 font-semibold text-xs text-white rounded-xl shadow-lg transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Assign New Credentials
                </button>
              </div>

              <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/30 overflow-x-auto shadow-lg">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 font-semibold text-xs border-b border-white/5">
                    <th className="py-4 px-6">Email / Account ID</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Role Assignment</th>
                    <th className="py-4 px-6">Department Station</th>
                    <th className="py-4 px-6 text-right">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4.5 px-6">
                        <span className="font-semibold text-slate-200">{u.email}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{u.id}</span>
                      </td>
                      <td className="py-4.5 px-6 font-semibold">{u.name}</td>
                      <td className="py-4.5 px-6">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          className="px-2 py-1.5 border border-glass bg-slate-950/20 text-slate-300 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="Administrator">Administrator</option>
                          <option value="Biomedical Engineer">Biomedical Engineer</option>
                          <option value="Technician">Technician</option>
                          <option value="Department Staff">Department Staff</option>
                        </select>
                      </td>
                      <td className="py-4.5 px-6">
                        <select
                          value={u.department}
                          onChange={(e) => handleUpdateDepartment(u.id, e.target.value)}
                          className="px-2 py-1.5 border border-glass bg-slate-950/20 text-slate-300 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="Biomedical Engineering">Biomedical Engineering</option>
                          <option value="Radiology">Radiology</option>
                          <option value="Cardiology">Cardiology</option>
                          <option value="Obstetrics & Gynecology">OB/GYN</option>
                          <option value="ICU">ICU</option>
                          <option value="OR">Operating Room</option>
                        </select>
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        {u.approved === false ? (
                          <div className="flex justify-end items-center gap-2">
                            <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-lg border border-amber-500/20">
                              Pending Approval
                            </span>
                            <button
                              onClick={() => handleApproveUser(u.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-md transition-colors animate-pulse"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                            Approved ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {/* Sub Tab: Audit System Logs */}
          {activeSubTab === 'logs' && (
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/30 overflow-x-auto shadow-lg">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 font-semibold text-xs border-b border-white/5">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Operator</th>
                    <th className="py-4 px-6">Action Trigger</th>
                    <th className="py-4 px-6">Transaction Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300 font-mono">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-6 text-[10px] text-slate-500">
                        {new Date(log.timestamp || (log as any).createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-slate-300 font-sans font-semibold">{log.userName}</span>
                        <span className="text-[9px] text-slate-500 block">{log.userId}</span>
                      </td>
                      <td className="py-3 px-6 text-cyan-400 font-semibold">{log.action}</td>
                      <td className="py-3 px-6 text-slate-400 font-sans max-w-sm truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub Tab: Database Backup/Restore */}
          {activeSubTab === 'db' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Backup */}
              <GlassCard className="border-white/5 bg-slate-900/40 space-y-4">
                <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 w-fit"><Download className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-slate-200">Export System Database Backup</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Downloads a single aggregated JSON file schema holding the equipment registry, maintenance lists, calibration tables, parts index, and system audit logs.
                  </p>
                </div>
                <button
                  onClick={handleTriggerBackup}
                  className="py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/10 transition-colors"
                >
                  Download DB Schema Backup
                </button>
              </GlassCard>

              {/* Restore */}
              <GlassCard className="border-white/5 bg-slate-900/40 space-y-4">
                <div className="p-3.5 rounded-2xl bg-violet-500/10 text-violet-400 w-fit">
                  {restoring ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Import / Restore System Database</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Restore collections from a downloaded BioTrack backup JSON file. Overwrites current records and updates system schemas.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleTriggerRestore}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={restoring}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {restoring ? 'Restoring Node...' : 'Upload Backup JSON'}
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {activeSubTab === 'docs' && apiDocs && (
            <GlassCard className="border-white/5 bg-slate-900/40 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">{apiDocs.info.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{apiDocs.info.description}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
                  v{apiDocs.info.version}
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                {Object.keys(apiDocs.paths).map((path) => (
                  <div key={path} className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${Object.keys(apiDocs.paths[path])[0] === 'get' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                        {Object.keys(apiDocs.paths[path])[0].toUpperCase()}
                      </span>
                      <span className="text-slate-200 font-semibold">{path}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">{apiDocs.paths[path][Object.keys(apiDocs.paths[path])[0]].summary}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Admin Create User Modal */}
      {userFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setUserFormOpen(false)} />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-md border border-white/10 rounded-3xl bg-slate-900 text-white shadow-2xl p-6 z-10 animate-scale-up">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="font-bold text-lg">Assign User Credentials</h3>
                <button onClick={() => setUserFormOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    placeholder="Dr. John Doe"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="jdoe@hospital.com"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Role</label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                    >
                      <option value="Administrator">Administrator</option>
                      <option value="Biomedical Engineer">Biomedical Engineer</option>
                      <option value="Technician">Technician</option>
                      <option value="Department Staff">Department Staff</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Department</label>
                    <select
                      value={newUserForm.department}
                      onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                    >
                      <option value="Radiology">Radiology</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Obstetrics & Gynecology">OB/GYN</option>
                      <option value="ICU">ICU</option>
                      <option value="OR">Operating Room</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setUserFormOpen(false)}
                    className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/10"
                  >
                    Save Credentials
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
