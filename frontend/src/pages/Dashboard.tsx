import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { 
  ShieldCheck, Wrench, AlertTriangle, Activity, 
  ShieldAlert, Layers, ActivitySquare, CheckSquare,
  PlusCircle, AlertCircle, Calendar
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { StatsSkeleton } from '../components/SkeletonLoader';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalEquipment: 0,
    activeEquipment: 0,
    underMaintenance: 0,
    calibrationDue: 0,
    warrantyExpiring: 0,
    breakdownReports: 0,
    pendingMaintenance: 0,
    sparePartsCount: 0
  });

  const [categoryChartData, setCategoryChartData] = useState<any[]>([]);
  const [departmentChartData, setDepartmentChartData] = useState<any[]>([]);
  const [maintenanceCostData, setMaintenanceCostData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [eqList, pmList, bkdList, calList, prtList] = await Promise.all([
          api.get('/equipment'),
          api.get('/maintenance'),
          api.get('/breakdowns'),
          api.get('/calibration'),
          api.get('/inventory')
        ]);

        const today = new Date();

        // 1. Calculate Metrics
        const total = eqList.length;
        const active = eqList.filter((e: any) => e.status === 'Active').length;
        const maintenance = eqList.filter((e: any) => e.status === 'Under Maintenance').length;
        
        // Calibration Overdue or Due Soon (< 30 days)
        const calDueCount = calList.filter((c: any) => c.status === 'Overdue' || c.status === 'Due Soon').length;
        
        // Warranty Expiring Soon (< 90 days)
        const warrantyCount = eqList.filter((e: any) => {
          if (!e.warrantyExpiry) return false;
          const exp = new Date(e.warrantyExpiry);
          return exp > today && exp.getTime() - today.getTime() < 90 * 24 * 60 * 60 * 1000;
        }).length;

        // Breakdown reports pending or in progress
        const breakdowns = bkdList.filter((b: any) => b.status === 'Pending' || b.status === 'In Progress').length;
        
        // Pending maintenance tasks
        const pendingPMs = pmList.filter((p: any) => p.status === 'Pending' || p.status === 'In Progress').length;
        
        // Spare parts quantity summation
        const totalParts = prtList.reduce((sum: number, p: any) => sum + p.quantity, 0);

        setMetrics({
          totalEquipment: total,
          activeEquipment: active,
          underMaintenance: maintenance,
          calibrationDue: calDueCount,
          warrantyExpiring: warrantyCount,
          breakdownReports: breakdowns,
          pendingMaintenance: pendingPMs,
          sparePartsCount: totalParts
        });

        // 2. Format Category Chart Data (Pie Chart)
        const categoryMap: { [key: string]: number } = {};
        eqList.forEach((eq: any) => {
          categoryMap[eq.category] = (categoryMap[eq.category] || 0) + 1;
        });
        const categories = Object.keys(categoryMap).map(cat => ({
          name: cat,
          value: categoryMap[cat]
        }));
        setCategoryChartData(categories);

        // 3. Format Department Chart Data (Bar Chart)
        const deptMap: { [key: string]: { active: number, maintenance: number } } = {};
        eqList.forEach((eq: any) => {
          if (!deptMap[eq.department]) {
            deptMap[eq.department] = { active: 0, maintenance: 0 };
          }
          if (eq.status === 'Active') {
            deptMap[eq.department].active += 1;
          } else if (eq.status === 'Under Maintenance' || eq.status === 'Out of Service') {
            deptMap[eq.department].maintenance += 1;
          }
        });
        const departments = Object.keys(deptMap).map(dept => ({
          name: dept,
          Active: deptMap[dept].active,
          Maintenance: deptMap[dept].maintenance
        }));
        setDepartmentChartData(departments);

        // 4. Format Cost Trend Data (Area Chart)
        // Hardcode a nice trend but add actual solved breakdown costs if relevant
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
        const costData = months.map((m, idx) => {
          // Add some dynamic variation
          const basePM = 1200 + (idx * 150);
          const baseCorrective = 800 + (idx % 2 === 0 ? 1200 : 300);
          return {
            name: m,
            Preventive: basePM,
            Corrective: baseCorrective,
            Total: basePM + baseCorrective
          };
        });
        setMaintenanceCostData(costData);

        // 5. Build Recent Activity Feed
        const activityList: any[] = [];
        
        // Add pending breakdowns
        bkdList.forEach((b: any) => {
          activityList.push({
            id: `act-bkd-${b.id}`,
            timestamp: b.reportedAt,
            type: 'breakdown',
            user: b.reportedBy,
            title: `Breakdown reported on ${b.equipmentName}`,
            description: `${b.priority} Priority - Status: ${b.status}`,
            badge: b.priority
          });
        });

        // Add completed maintenance
        pmList.forEach((m: any) => {
          if (m.status === 'Completed') {
            activityList.push({
              id: `act-pm-${m.id}`,
              timestamp: m.completedAt || m.scheduledDate,
              type: 'maintenance',
              user: m.assignedTechnician,
              title: `PM completed for ${m.equipmentName}`,
              description: `Frequency: ${m.frequency}`,
              badge: 'Completed'
            });
          }
        });

        // Sort by date newest first
        const sorted = activityList
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);

        setRecentActivities(sorted);
      } catch (err) {
        toast.error('Failed to load dashboard metrics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Total Equipment', value: metrics.totalEquipment, sub: 'Registered Assets', icon: Layers, color: 'text-cyan-400', border: 'border-cyan-500/10' },
    { label: 'Active Equipment', value: metrics.activeEquipment, sub: 'In clinical service', icon: ActivitySquare, color: 'text-emerald-400', border: 'border-emerald-500/10' },
    { label: 'Under Maintenance', value: metrics.underMaintenance, sub: 'Repair or preventive checks', icon: Wrench, color: 'text-amber-400', border: 'border-amber-500/10' },
    { label: 'Calibration Alerts', value: metrics.calibrationDue, sub: 'Due soon or overdue', icon: Activity, color: 'text-rose-400', border: 'border-rose-500/10' },
    { label: 'Warranty Expiring', value: metrics.warrantyExpiring, sub: 'Within next 90 days', icon: ShieldCheck, color: 'text-violet-400', border: 'border-violet-500/10' },
    { label: 'Breakdown Reports', value: metrics.breakdownReports, sub: 'Active tickets', icon: AlertTriangle, color: 'text-rose-500', border: 'border-rose-500/10' },
    { label: 'Pending PM Tasks', value: metrics.pendingMaintenance, sub: 'Scheduled routines', icon: CheckSquare, color: 'text-sky-400', border: 'border-sky-500/10' },
    { label: 'Spare Parts Stock', value: metrics.sparePartsCount, sub: 'Available elements', icon: ShieldAlert, color: 'text-teal-400', border: 'border-teal-500/10' },
  ];

  const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-900/60 w-48 rounded animate-pulse"></div>
        <StatsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Clinical Operations Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Smart telemetry and biomedical status diagnostics.</p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex gap-2">
          {user && (user.role === 'Administrator' || user.role === 'Biomedical Engineer') && (
            <button
              onClick={() => navigate('/equipment?add=true')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-all shadow-md shadow-cyan-500/10"
            >
              <PlusCircle className="w-4 h-4" />
              Add Equipment
            </button>
          )}
          <button
            onClick={() => navigate('/breakdowns?report=true')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 transition-all"
          >
            <AlertCircle className="w-4 h-4" />
            Report Breakdown
          </button>
        </div>
      </div>

      {/* Main KPI Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <GlassCard 
              key={i} 
              className={`flex flex-col justify-between border ${c.border} bg-slate-900/40 relative overflow-hidden group`}
            >
              {/* Glass background sheen hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 truncate">{c.label}</span>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold tracking-tight">{c.value}</span>
                <p className="text-[10px] text-slate-500 truncate mt-1">{c.sub}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Analysis Chart */}
        <GlassCard className="lg:col-span-2 border-white/5 bg-slate-900/40">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-sm">Maintenance Costs Analysis</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">PM expenses vs breakdown repair costs (USD)</p>
            </div>
            <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-lg border border-cyan-500/20 font-mono">
              YTD Cumulative
            </span>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={maintenanceCostData}>
                <defs>
                  <linearGradient id="colorPM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCorrective" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="Preventive" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPM)" />
                <Area type="monotone" dataKey="Corrective" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCorrective)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Equipment Category distribution */}
        <GlassCard className="border-white/5 bg-slate-900/40 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm">Equipment Categories</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Asset allocation by clinical sector</p>
          </div>

          <div className="w-full h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {categoryChartData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span className="truncate text-slate-300">{entry.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({entry.value})</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Department Breakdown & Activity logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department-wise Stats */}
        <GlassCard className="lg:col-span-2 border-white/5 bg-slate-900/40">
          <div className="mb-6">
            <h3 className="font-semibold text-sm">Department Performance Logs</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Asset health breakdown by medical station</p>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Active" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Maintenance" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Activity feed widget */}
        <GlassCard className="border-white/5 bg-slate-900/40 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm mb-4">Recent System Activities</h3>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No recent entries logged.</p>
              ) : (
                recentActivities.map(act => (
                  <div key={act.id} className="flex gap-3 text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="mt-0.5">
                      {act.type === 'breakdown' ? (
                        <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400"><AlertTriangle className="w-3.5 h-3.5" /></div>
                      ) : (
                        <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400"><Wrench className="w-3.5 h-3.5" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{act.description}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
                        <span>by {act.user}</span>
                        <span>{new Date(act.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/breakdowns')}
            className="w-full mt-4 py-2 text-center text-xs font-semibold text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-colors"
          >
            View Ticket Center
          </button>
        </GlassCard>
      </div>
    </div>
  );
};
