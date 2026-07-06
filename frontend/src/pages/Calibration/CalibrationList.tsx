import React, { useState, useEffect } from 'react';
import { 
  Activity, Calendar, Plus, FileText, X, AlertTriangle, 
  CheckCircle, ArrowRight, User, ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { GlassCard } from '../../components/GlassCard';
import { StatusBadge } from '../../components/StatusBadge';
import { TableSkeleton } from '../../components/SkeletonLoader';

interface Calibration {
  id: string;
  equipmentId: string;
  equipmentName: string;
  calibrationDate: string;
  nextDueDate: string;
  frequency: string;
  performedBy: string;
  certificateNumber: string;
  status: 'Active' | 'Due Soon' | 'Overdue';
  notes: string;
}

export const CalibrationList: React.FC = () => {
  const { user, hasRole } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [formData, setFormData] = useState({
    equipmentId: '',
    calibrationDate: '',
    nextDueDate: '',
    frequency: '12 Months',
    performedBy: '',
    certificateNumber: '',
    notes: ''
  });

  const loadCalibrations = async () => {
    setLoading(true);
    try {
      const data = await api.get('/calibration');
      setCalibrations(data);
    } catch (err) {
      toast.error('Failed to load calibration logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalibrations();
  }, []);

  const handleOpenForm = () => {
    setFormData({
      equipmentId: '',
      calibrationDate: new Date().toISOString().split('T')[0],
      nextDueDate: '',
      frequency: '12 Months',
      performedBy: user?.name || '',
      certificateNumber: `CERT-${Math.floor(10000 + Math.random() * 90000)}`,
      notes: ''
    });
    setLogOpen(true);
  };

  const handleLogCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentId || !formData.calibrationDate || !formData.nextDueDate) {
      toast.error('Please specify target asset, date performed, and next due date.');
      return;
    }

    try {
      await api.post('/calibration', formData);
      toast.success(`Calibration recorded. Syncing dates on asset registry...`);
      setLogOpen(false);
      loadCalibrations();
    } catch (err: any) {
      toast.error(err.message || 'Logging calibration failed.');
    }
  };

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Equipment Calibration Registry</h1>
          <p className="text-slate-400 text-sm mt-1">Audit verification logs, certificates, and compliance schedules.</p>
        </div>
        {hasRole(['Administrator', 'Biomedical Engineer', 'Technician']) && (
          <button
            onClick={handleOpenForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 font-semibold text-xs text-white rounded-xl shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Calibration
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="border-emerald-500/10 bg-emerald-500/5 p-4 flex gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <h4 className="text-2xl font-bold tracking-tight">{calibrations.filter(c => c.status === 'Active').length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Compliant Active Assets</p>
          </div>
        </GlassCard>

        <GlassCard className="border-amber-500/10 bg-amber-500/5 p-4 flex gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400"><Calendar className="w-6 h-6" /></div>
          <div>
            <h4 className="text-2xl font-bold tracking-tight">{calibrations.filter(c => c.status === 'Due Soon').length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Calibrations Due Soon (&lt;30 days)</p>
          </div>
        </GlassCard>

        <GlassCard className="border-rose-500/10 bg-rose-500/5 p-4 flex gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-400"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <h4 className="text-2xl font-bold tracking-tight">{calibrations.filter(c => c.status === 'Overdue').length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Overdue Calibrations</p>
          </div>
        </GlassCard>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : calibrations.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl bg-slate-900/20 text-slate-500">
          No calibration activities logged in the database.
        </div>
      ) : (
        <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/30 overflow-x-auto shadow-lg">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold text-xs border-b border-white/5">
                <th className="py-4 px-6">Asset ID</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Verification Date</th>
                <th className="py-4 px-6">Next Due Date</th>
                <th className="py-4 px-6">Certificate No</th>
                <th className="py-4 px-6">Performed By</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {calibrations.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-cyan-400 font-semibold">{c.equipmentId}</td>
                  <td className="py-4 px-6 font-semibold text-slate-200">{c.equipmentName}</td>
                  <td className="py-4 px-6 font-mono text-xs">{c.calibrationDate}</td>
                  <td className="py-4 px-6 font-mono text-xs">{c.nextDueDate}</td>
                  <td className="py-4 px-6 font-mono text-xs flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.certificateNumber}</span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-400">{c.performedBy}</td>
                  <td className="py-4 px-6"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Calibration Modal */}
      {logOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setLogOpen(false)}
          />

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-md border border-white/10 rounded-3xl bg-slate-900 text-white shadow-2xl p-6 overflow-hidden z-10 animate-scale-up">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="font-bold text-lg">Log Device Calibration</h3>
                <button
                  onClick={() => setLogOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogCalibration} className="space-y-4">
                {/* Equipment ID */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Target Asset ID</label>
                  <input
                    type="text"
                    required
                    value={formData.equipmentId}
                    onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                    placeholder="e.g. EQ-002"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Calibration Date */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Calibration Date</label>
                    <input
                      type="date"
                      required
                      value={formData.calibrationDate}
                      onChange={(e) => setFormData({ ...formData, calibrationDate: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  {/* Next Due Date */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Next Due Date</label>
                    <input
                      type="date"
                      required
                      value={formData.nextDueDate}
                      onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Performed By */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Performed By (Technician / Auditor)</label>
                  <input
                    type="text"
                    required
                    value={formData.performedBy}
                    onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
                    placeholder="e.g. Fluke Safety Labs"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Cert Number */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Certificate Reference Number</label>
                  <input
                    type="text"
                    required
                    value={formData.certificateNumber}
                    onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                    placeholder="e.g. CERT-FLK-88910"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Calibration Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Checked parameters, zeroed values."
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setLogOpen(false)}
                    className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/10"
                  >
                    Save Calibration Record
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
