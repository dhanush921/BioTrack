import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  AlertOctagon, Plus, User, Clock, DollarSign, 
  CheckCircle, ArrowRight, UserPlus, Play, X, FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { GlassCard } from '../../components/GlassCard';
import { StatusBadge } from '../../components/StatusBadge';
import { CardSkeleton } from '../../components/SkeletonLoader';

interface Ticket {
  id: string;
  equipmentId: string;
  equipmentName: string;
  reportedBy: string;
  department: string;
  problemDescription: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedEngineer: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  reportedAt: string;
  estimatedCompletion?: string;
  actualCompletion?: string;
  downtimeHours: number;
  repairCost: number;
  solution: string;
}

export const BreakdownList: React.FC = () => {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const [ticketsData, eqData] = await Promise.all([
        api.get('/breakdowns'),
        api.get('/equipment')
      ]);
      setTickets(ticketsData);
      setEquipmentList(eqData);
    } catch (err) {
      toast.error('Failed to load breakdown ticket center.');
    } finally {
      setLoading(false);
    }
  };
  
  // Dialog overlay controls
  const [reportOpen, setReportOpen] = useState(false);
  const [formData, setFormData] = useState({
    equipmentId: '',
    problemDescription: '',
    priority: 'Medium'
  });



  useEffect(() => {
    loadTickets();
  }, []);

  // Pre-fill check
  useEffect(() => {
    const preFillId = searchParams.get('preFill');
    const reportParam = searchParams.get('report');
    if (preFillId) {
      setFormData(prev => ({
        ...prev,
        equipmentId: preFillId
      }));
      setReportOpen(true);
    } else if (reportParam === 'true') {
      setReportOpen(true);
    }
  }, [searchParams]);

  const handleReportBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentId || !formData.problemDescription) {
      toast.error('Please specify target asset and fault description.');
      return;
    }

    try {
      await api.post('/breakdowns', formData);
      toast.success('Breakdown reported. Engineering team alerted.');
      setReportOpen(false);
      setFormData({ equipmentId: '', problemDescription: '', priority: 'Medium' });
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Report ticket generation failed.');
    }
  };

  const handleAssignEngineer = async (ticketId: string) => {
    const name = prompt('Enter engineer name to assign:', user?.name || '');
    if (!name) return;

    try {
      await api.put(`/breakdowns/${ticketId}`, { 
        assignedEngineer: name,
        status: 'In Progress' 
      });
      toast.info(`Ticket assigned to ${name}. Progress marked In Progress.`);
      loadTickets();
    } catch (e) {
      toast.error('Assignment failed.');
    }
  };

  const handleStartRepair = async (ticketId: string) => {
    try {
      await api.put(`/breakdowns/${ticketId}`, { 
        assignedEngineer: user?.name || 'In-House BioMed Team',
        status: 'In Progress' 
      });
      toast.info('Repair started. Status updated.');
      loadTickets();
    } catch (e) {
      toast.error('State transition failed.');
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    const solution = prompt('Enter resolution summary / troubleshooting fixes:') || '';
    if (!solution) {
      toast.error('Please supply resolution description before closing.');
      return;
    }
    const cost = Number(prompt('Enter total replacement parts cost ($):', '0') || '0');
    const downtime = Number(prompt('Enter total asset downtime in hours:', '1') || '1');

    try {
      await api.put(`/breakdowns/${ticketId}`, {
        status: 'Completed',
        solution,
        repairCost: cost,
        downtimeHours: downtime
      });
      toast.success('Breakdown ticket resolved. Asset marked Active.');
      loadTickets();
    } catch (e) {
      toast.error('Failed to resolve ticket.');
    }
  };

  const filteredTickets = tickets.filter(t => t.status === activeTab);

  const tabClasses = (tab: typeof activeTab) => `
    flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all
    ${activeTab === tab 
      ? 'border-cyan-500 text-cyan-400 font-bold' 
      : 'border-transparent text-slate-400 hover:text-slate-200'}
  `;

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Corrective Breakdown Tickets</h1>
          <p className="text-slate-400 text-sm mt-1">Alert, assign, and track troubleshooting of faulty assets.</p>
        </div>
        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 font-semibold text-xs text-white rounded-xl shadow-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report Breakdown
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5">
        <button onClick={() => setActiveTab('Pending')} className={tabClasses('Pending')}>
          Pending Alerts ({tickets.filter(t => t.status === 'Pending').length})
        </button>
        <button onClick={() => setActiveTab('In Progress')} className={tabClasses('In Progress')}>
          Repairs In Progress ({tickets.filter(t => t.status === 'In Progress').length})
        </button>
        <button onClick={() => setActiveTab('Completed')} className={tabClasses('Completed')}>
          Closed Tickets ({tickets.filter(t => t.status === 'Completed').length})
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-16 border border-white/5 border-dashed rounded-2xl bg-slate-900/10 text-slate-500 text-sm">
          No breakdown tickets registered in category: {activeTab}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map(t => (
            <GlassCard key={t.id} className="border-white/5 bg-slate-900/40 flex flex-col justify-between h-full hover:border-white/10 transition-all">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono text-cyan-400 font-semibold">{t.id}</span>
                  <StatusBadge status={t.priority} />
                </div>

                {/* Body */}
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-200">{t.equipmentName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Asset ID: {t.equipmentId}</p>
                  <p className="text-xs text-slate-400 pt-1 line-clamp-3 leading-relaxed">
                    {t.problemDescription}
                  </p>
                </div>

                {/* Details list */}
                <div className="pt-3 border-t border-white/5 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Reported by:</span>
                    <span className="text-slate-300 font-medium">{t.reportedBy} ({t.department})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date reported:</span>
                    <span className="text-slate-300 font-mono">{new Date(t.reportedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engineer assigned:</span>
                    <span className="text-slate-300 font-medium">{t.assignedEngineer || 'Unassigned'}</span>
                  </div>
                </div>

                {t.status === 'Completed' && (
                  <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-[11px] text-slate-300 space-y-2 font-mono">
                    <p className="font-semibold text-emerald-400 font-sans">Resolution Summary:</p>
                    <p className="text-[10px] leading-relaxed">{t.solution}</p>
                    <div className="flex justify-between pt-1 border-t border-white/5 text-[9px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Downtime: {t.downtimeHours} hr</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Repair Cost: ${t.repairCost}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons based on roles */}
              {hasRole(['Administrator', 'Biomedical Engineer', 'Technician']) && t.status !== 'Completed' && (
                <div className="pt-4 mt-4 border-t border-white/5 flex gap-2">
                  {t.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleAssignEngineer(t.id)}
                        className="flex-1 py-2 text-center text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign
                      </button>
                      <button
                        onClick={() => handleStartRepair(t.id)}
                        className="flex-1 py-2 text-center text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg border border-cyan-500/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Claim
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleResolveTicket(t.id)}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-xs shadow-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve Ticket
                    </button>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Report Breakdown Modal overlay */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setReportOpen(false)}
          />

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-md border border-white/10 rounded-3xl bg-slate-900 text-white shadow-2xl p-6 overflow-hidden z-10 animate-scale-up">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="font-bold text-lg">Report Equipment Breakdown</h3>
                <button
                  onClick={() => setReportOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReportBreakdown} className="space-y-4">
                {/* Equipment Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Target Clinical Asset</label>
                  <select
                    required
                    value={formData.equipmentId}
                    onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                  >
                    <option value="">-- Select Asset --</option>
                    {equipmentList.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.id} - {eq.name} ({eq.branch || 'City Central'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Fault Priority Alert</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                  >
                    <option value="Low">Low (Visual/minor anomaly)</option>
                    <option value="Medium">Medium (Partial performance degradation)</option>
                    <option value="High">High (Substantial failure, unit offline)</option>
                    <option value="Critical">Critical (Life-support crash, OR locked out)</option>
                  </select>
                </div>

                {/* Problem Description */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Description of Failure symptoms</label>
                  <textarea
                    required
                    value={formData.problemDescription}
                    onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                    placeholder="Provide details: Unit sparks when plugged in, shadow on right corner, flow sensor failure alarms..."
                    rows={4}
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-xs focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/10"
                  >
                    Transmit Breakdown Alert
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
