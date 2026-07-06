import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, ShieldCheck, Calendar, DollarSign, 
  Clock, X, AlertTriangle, CheckCircle, RefreshCw, User
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { GlassCard } from '../../components/GlassCard';
import { StatusBadge } from '../../components/StatusBadge';
import { TableSkeleton } from '../../components/SkeletonLoader';

interface Contract {
  id: string;
  contractNumber: string;
  vendor: string;
  contractType: 'AMC' | 'CMC' | string;
  equipmentId: string;
  equipmentName: string;
  startDate: string;
  endDate: string;
  cost: number;
  slaResponseHours: number;
  status: 'Active' | 'Due Soon' | 'Expired';
  notes: string;
}

export const ContractsList: React.FC = () => {
  const { user, hasRole } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    contractNumber: '',
    vendor: '',
    contractType: 'CMC',
    equipmentId: '',
    startDate: '',
    endDate: '',
    cost: 0,
    slaResponseHours: 24,
    notes: ''
  });

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/contracts');
      setContracts(data);
    } catch (e) {
      toast.error('Failed to load contracts database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleOpenForm = () => {
    setFormData({
      contractNumber: `CON-${Math.floor(1000 + Math.random() * 9000)}`,
      vendor: '',
      contractType: 'CMC',
      equipmentId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      cost: 0,
      slaResponseHours: 24,
      notes: ''
    });
    setFormOpen(true);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentId || !formData.vendor || !formData.endDate) {
      toast.error('Please specify target equipment ID, vendor name, and expiration date.');
      return;
    }

    try {
      await api.post('/contracts', formData);
      toast.success('Maintenance contract successfully registered.');
      setFormOpen(false);
      loadContracts();
    } catch (err: any) {
      toast.error(err.message || 'Contract registration failed.');
    }
  };

  const handleRenewalReminder = (contract: Contract) => {
    toast.info(`Renewal alert sent to vendor: ${contract.vendor} regarding contract ${contract.contractNumber}.`);
  };

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">AMC / CMC Contract Center</h1>
          <p className="text-slate-400 text-sm mt-1">Manage vendor service scopes, SLAs, and renewal warnings.</p>
        </div>
        {hasRole(['Administrator', 'Biomedical Engineer']) && (
          <button
            onClick={handleOpenForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 font-semibold text-xs text-white rounded-xl shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Contract
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="border-emerald-500/10 bg-emerald-500/5 p-4 flex gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <h4 className="text-2xl font-bold tracking-tight">{contracts.filter(c => c.status === 'Active').length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Active Contracts Coverage</p>
          </div>
        </GlassCard>

        <GlassCard className="border-amber-500/10 bg-amber-500/5 p-4 flex gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400"><Calendar className="w-6 h-6" /></div>
          <div>
            <h4 className="text-2xl font-bold tracking-tight">{contracts.filter(c => c.status === 'Due Soon').length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Due for Renewal (&lt;30 days)</p>
          </div>
        </GlassCard>

        <GlassCard className="border-rose-500/10 bg-rose-500/5 p-4 flex gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-400"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <h4 className="text-2xl font-bold tracking-tight">{contracts.filter(c => c.status === 'Expired').length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Expired Service Contracts</p>
          </div>
        </GlassCard>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl bg-slate-900/20 text-slate-500">
          No AMC/CMC contracts registered in database.
        </div>
      ) : (
        <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/30 overflow-x-auto shadow-lg">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold text-xs border-b border-white/5">
                <th className="py-4 px-6">Contract No</th>
                <th className="py-4 px-6">Equipment</th>
                <th className="py-4 px-6">Vendor Provider</th>
                <th className="py-4 px-6">Scope Type</th>
                <th className="py-4 px-6">SLA Response</th>
                <th className="py-4 px-6">Annual Cost</th>
                <th className="py-4 px-6">Expiration</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {contracts.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4.5 px-6 font-mono text-xs text-cyan-400 font-semibold">{c.contractNumber}</td>
                  <td className="py-4.5 px-6 font-semibold text-slate-200">
                    <div>{c.equipmentName}</div>
                    <span className="text-[10px] text-slate-500 font-normal">Asset ID: {c.equipmentId}</span>
                  </td>
                  <td className="py-4.5 px-6 text-xs text-slate-400">{c.vendor}</td>
                  <td className="py-4.5 px-6">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.contractType === 'CMC' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                      {c.contractType}
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.slaResponseHours} hrs max</span>
                  </td>
                  <td className="py-4.5 px-6 font-mono text-xs font-semibold text-slate-200">${c.cost?.toLocaleString()}</td>
                  <td className="py-4.5 px-6 font-mono text-xs">{c.endDate}</td>
                  <td className="py-4.5 px-6"><StatusBadge status={c.status} /></td>
                  <td className="py-4.5 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleRenewalReminder(c)}
                        className="py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/30 transition-all"
                      >
                        Remind Vendor
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Contract Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          />

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-md border border-white/10 rounded-3xl bg-slate-900 text-white shadow-2xl p-6 overflow-hidden z-10 animate-scale-up">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="font-bold text-lg">Log Maintenance Contract</h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateContract} className="space-y-4">
                {/* Contract Number */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Contract Number</label>
                  <input
                    type="text"
                    required
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                {/* Target Equipment */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Target Asset ID</label>
                  <input
                    type="text"
                    required
                    value={formData.equipmentId}
                    onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                    placeholder="e.g. EQ-001"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Vendor name */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Vendor / Provider Name</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g. GE HealthCare Support"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Contract Type */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Coverage Type</label>
                    <select
                      value={formData.contractType}
                      onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                    >
                      <option value="CMC">CMC (Comprehensive)</option>
                      <option value="AMC">AMC (Annual Only)</option>
                    </select>
                  </div>

                  {/* SLA Response */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">SLA Response Limit (hrs)</label>
                    <input
                      type="number"
                      required
                      value={formData.slaResponseHours}
                      onChange={(e) => setFormData({ ...formData, slaResponseHours: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Expiration Date</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Annual cost */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Annual Contract Cost ($)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Notes / Service Exclusions</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Covers tube replacements."
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/10"
                  >
                    Save Contract
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
