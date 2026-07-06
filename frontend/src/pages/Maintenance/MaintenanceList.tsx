import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Wrench, Calendar, Plus, CheckSquare, Square, 
  User, ClipboardList, CheckCircle2, Play, AlertCircle, FileText, X
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { GlassCard } from '../../components/GlassCard';
import { StatusBadge } from '../../components/StatusBadge';
import { CardSkeleton } from '../../components/SkeletonLoader';

interface PMTask {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: string;
  frequency: string;
  checklist: { task: string; done: boolean }[];
  scheduledDate: string;
  assignedTechnician: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  notes: string;
  serviceReportUrl?: string;
  completedAt?: string;
  cost?: number;
}

export const MaintenanceList: React.FC = () => {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [activeTask, setActiveTask] = useState<PMTask | null>(null);
  
  // Schedule Form states
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    equipmentId: '',
    frequency: 'Monthly',
    scheduledDate: '',
    assignedTechnician: '',
    notes: '',
    checklistText: ''
  });

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/maintenance');
      setTasks(data);
    } catch (err) {
      toast.error('Failed to load maintenance schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Pre-fill equipment ID check from URL queries
  useEffect(() => {
    const preFillId = searchParams.get('preFill');
    if (preFillId) {
      setFormData(prev => ({
        ...prev,
        equipmentId: preFillId,
        scheduledDate: new Date().toISOString().split('T')[0]
      }));
      setFormOpen(true);
    }
  }, [searchParams]);

  const handleStartTask = async (task: PMTask) => {
    try {
      const updated = await api.put(`/maintenance/${task.id}`, { status: 'In Progress' });
      toast.info(`Task for ${task.equipmentName} set to In Progress.`);
      loadTasks();
      setActiveTask(updated);
    } catch (e) {
      toast.error('Failed to initiate task.');
    }
  };

  const handleToggleChecklistItem = async (task: PMTask, itemIndex: number) => {
    const updatedChecklist = [...task.checklist];
    updatedChecklist[itemIndex].done = !updatedChecklist[itemIndex].done;
    
    try {
      const updated = await api.put(`/maintenance/${task.id}`, { checklist: updatedChecklist });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      if (activeTask && activeTask.id === task.id) {
        setActiveTask(updated);
      }
    } catch (e) {
      toast.error('Failed to update checklist status.');
    }
  };

  const handleCompleteTask = async (task: PMTask) => {
    // Check if checklist elements are complete
    const incomplete = task.checklist.some(c => !c.done);
    if (incomplete && !window.confirm('Some checklist actions remain incomplete. Resolve PM anyway?')) return;

    const notes = prompt('Enter service report summaries or repair logs:', task.notes) || task.notes;
    const cost = Number(prompt('Enter repair/servicing part cost ($):', '0') || '0');

    try {
      await api.put(`/maintenance/${task.id}`, {
        status: 'Completed',
        notes,
        cost,
        serviceReportUrl: '/reports/simulated_sr.pdf'
      });
      toast.success(`PM Routine completed. Equipment status synced back to Active.`);
      setActiveTask(null);
      loadTasks();
    } catch (e) {
      toast.error('Failed to resolve maintenance.');
    }
  };

  const handleCreatePM = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse raw text tasks separated by new lines
    const parsedChecklist = formData.checklistText
      .split('\n')
      .filter(t => t.trim().length > 0)
      .map(task => ({ task, done: false }));

    if (parsedChecklist.length === 0) {
      parsedChecklist.push({ task: 'General visual and safety check', done: false });
    }

    try {
      await api.post('/maintenance', {
        equipmentId: formData.equipmentId,
        frequency: formData.frequency,
        scheduledDate: formData.scheduledDate,
        assignedTechnician: formData.assignedTechnician,
        notes: formData.notes,
        checklist: parsedChecklist
      });

      toast.success('Preventive Maintenance scheduled successfully.');
      setFormOpen(false);
      loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'PM schedule failed.');
    }
  };

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Preventive Maintenance Schedules</h1>
          <p className="text-slate-400 text-sm mt-1">Configure intervals and checklists for medical components.</p>
        </div>
        {hasRole(['Administrator', 'Biomedical Engineer']) && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 font-semibold text-xs text-white rounded-xl shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule PM
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List column */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">Scheduled Work orders</h3>
            {tasks.length === 0 ? (
              <p className="text-slate-500 py-8 text-center border border-white/5 rounded-2xl bg-slate-900/10">No maintenance schedules registered.</p>
            ) : (
              tasks.map(task => (
                <GlassCard 
                  key={task.id} 
                  className={`border-white/5 bg-slate-900/40 hover:border-white/10 hover:bg-slate-900/50 transition-all cursor-pointer ${activeTask?.id === task.id ? 'border-cyan-500/30 ring-1 ring-cyan-500/25' : ''}`}
                  onClick={() => setActiveTask(task)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-cyan-400 font-mono font-semibold">{task.id}</span>
                      <h4 className="font-bold text-slate-200">{task.equipmentName}</h4>
                      <p className="text-xs text-slate-400">Frequency: <span className="text-slate-300 font-semibold">{task.frequency}</span> • Due Date: {task.scheduledDate}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                        <User className="w-3.5 h-3.5" />
                        <span>Assigned to: {task.assignedTechnician}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <StatusBadge status={task.status} />
                      {task.status === 'Pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartTask(task); }}
                          className="flex items-center gap-1 py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/30 transition-all"
                        >
                          <Play className="w-3 h-3" />
                          Start PM
                        </button>
                      )}
                      {task.status === 'In Progress' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCompleteTask(task); }}
                          className="flex items-center gap-1 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-all"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {/* Active/Selected details drawer on side */}
          <div>
            <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider mb-4">Servicing Workspace</h3>
            {activeTask ? (
              <GlassCard className="border-cyan-500/20 bg-slate-900/60 sticky top-20 space-y-5">
                <div className="border-b border-white/5 pb-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{activeTask.id}</span>
                    <StatusBadge status={activeTask.status} />
                  </div>
                  <h4 className="font-bold text-lg text-slate-200 mt-1">{activeTask.equipmentName}</h4>
                  <p className="text-xs text-slate-500 mt-1">Asset ID: {activeTask.equipmentId}</p>
                </div>

                {/* Checklist task lines */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-xs text-slate-400 flex items-center gap-1">
                    <ClipboardList className="w-4 h-4" />
                    Calibration & Safety Checklist
                  </h5>
                  <div className="space-y-2">
                    {activeTask.checklist.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => activeTask.status === 'In Progress' && handleToggleChecklistItem(activeTask, idx)}
                        className={`
                          flex items-start gap-2.5 p-2 rounded-lg border text-xs transition-colors
                          ${activeTask.status === 'In Progress' ? 'cursor-pointer hover:bg-white/5' : ''}
                          ${item.done 
                            ? 'border-emerald-500/25 bg-emerald-500/5 text-slate-400' 
                            : 'border-white/5 bg-slate-950/20 text-slate-200'}
                        `}
                      >
                        {item.done ? (
                          <CheckSquare className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-slate-500 flex-shrink-0" />
                        )}
                        <span className={item.done ? 'line-through' : ''}>{item.task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes log */}
                <div className="space-y-1 text-xs">
                  <span className="text-slate-400 font-semibold">Service Log Summaries:</span>
                  <p className="p-2.5 rounded-lg border border-white/5 bg-slate-950/20 text-slate-300 font-mono text-[10px] leading-relaxed">
                    {activeTask.notes || 'No comments logged.'}
                  </p>
                </div>

                {activeTask.status === 'Completed' && (
                  <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-slate-300">Service Sheet Archived</p>
                      <a href={activeTask.serviceReportUrl} target="_blank" className="text-cyan-400 hover:underline mt-0.5 block">
                        Download sr_pm_{activeTask.id}.pdf
                      </a>
                    </div>
                  </div>
                )}

                {activeTask.status === 'In Progress' && (
                  <button
                    onClick={() => handleCompleteTask(activeTask)}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white rounded-xl font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete PM & Release Asset
                  </button>
                )}
              </GlassCard>
            ) : (
              <div className="p-12 text-center border border-white/5 border-dashed rounded-2xl bg-slate-900/10 text-slate-500 text-xs">
                Select a scheduled work order to verify checklists and run PM routines.
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Schedule Modal Dialog */}
      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          />

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-lg border border-white/10 rounded-3xl bg-slate-900 text-white shadow-2xl p-6 overflow-hidden z-10 animate-scale-up">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="font-bold text-lg">Schedule Preventive Maintenance</h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePM} className="space-y-4">
                <div className="space-y-4">
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
                    {/* Interval */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Maintenance Frequency</label>
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Scheduled Date</label>
                      <input
                        type="date"
                        required
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Tech Assign */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Assigned Technician</label>
                    <input
                      type="text"
                      required
                      value={formData.assignedTechnician}
                      onChange={(e) => setFormData({ ...formData, assignedTechnician: e.target.value })}
                      placeholder="e.g. Marcus Chen"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Checklist tasks (one per line) */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Checklist Guidelines (One task per line)</label>
                    <textarea
                      value={formData.checklistText}
                      onChange={(e) => setFormData({ ...formData, checklistText: e.target.value })}
                      placeholder="Verify chassis ground resistance&#10;Clean cooling exhaust vents&#10;Verify parameter limits accuracy"
                      rows={4}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-xs focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Special Notes/Directives</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Needs calibration phantom kit B."
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
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
                    Schedule PM Task
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
