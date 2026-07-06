import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, AlertTriangle, Activity, Wrench, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface NavbarProps {
  onMenuClick: () => void;
  onOpenScanner: () => void;
}

interface Notification {
  id: string;
  type: 'calibration' | 'warranty' | 'stock' | 'breakdown';
  title: string;
  message: string;
  link: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onOpenScanner }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchNotificationAlerts = async () => {
      if (!user) return;
      try {
        const eqList = await api.get('/equipment');
        const stockList = await api.get('/inventory');
        const tkts = await api.get('/breakdowns');
        
        const alerts: Notification[] = [];
        const today = new Date();

        // 1. Check Calibrations
        eqList.forEach((eq: any) => {
          if (eq.nextCalibrationDate) {
            const dueDate = new Date(eq.nextCalibrationDate);
            if (dueDate < today) {
              alerts.push({
                id: `cal-overdue-${eq.id}`,
                type: 'calibration',
                title: 'Calibration Overdue!',
                message: `${eq.name} (${eq.id}) calibration expired.`,
                link: `/equipment?search=${eq.id}`
              });
            } else if (dueDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) {
              alerts.push({
                id: `cal-due-${eq.id}`,
                type: 'calibration',
                title: 'Calibration Due Soon',
                message: `${eq.name} (${eq.id}) calibration due in 15 days.`,
                link: `/equipment?search=${eq.id}`
              });
            }
          }
        });

        // 2. Check Warranties
        eqList.forEach((eq: any) => {
          if (eq.warrantyExpiry) {
            const expDate = new Date(eq.warrantyExpiry);
            if (expDate > today && expDate.getTime() - today.getTime() < 90 * 24 * 60 * 60 * 1000) {
              alerts.push({
                id: `warranty-${eq.id}`,
                type: 'warranty',
                title: 'Warranty Expiring Soon',
                message: `${eq.name} warranty expires on ${eq.warrantyExpiry}.`,
                link: `/equipment?search=${eq.id}`
              });
            }
          }
        });

        // 3. Check Low Stock
        stockList.forEach((item: any) => {
          if (item.quantity <= item.minimumStock) {
            alerts.push({
              id: `stock-${item.id}`,
              type: 'stock',
              title: 'Low Spare Parts Stock',
              message: `${item.name} has only ${item.quantity} units remaining.`,
              link: '/inventory'
            });
          }
        });

        // 4. Critical Breakdowns
        tkts.forEach((t: any) => {
          if (t.status === 'Pending' && t.priority === 'Critical') {
            alerts.push({
              id: `breakdown-${t.id}`,
              type: 'breakdown',
              title: 'Unassigned Critical Breakdown',
              message: `${t.equipmentName} reported down: ${t.problemDescription.substring(0, 30)}...`,
              link: '/breakdowns'
            });
          }
        });

        setNotifications(alerts.slice(0, 5)); // Cap at 5 notifications
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };

    fetchNotificationAlerts();
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/equipment?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-16 border-b border-glass bg-glass shadow-glass flex items-center justify-between px-6 z-30 sticky top-0 backdrop-blur-md">
      {/* Mobile menu trigger & title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-xl border border-glass bg-glass text-slate-400 hover:text-slate-200 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block text-slate-400 text-sm font-medium">
          Workspace: <span className="text-cyan-400">BioTrack Central</span>
        </div>
      </div>

      {/* Global search */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search equipment, serial numbers, locations..."
            className="w-full pl-10 pr-4 py-2 border border-glass bg-slate-950/20 text-slate-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-slate-950/40 transition-all placeholder:text-slate-500"
          />
        </div>
      </form>

      {/* Action shortcuts: QR Scanner, Alerts bell, Theme toggler */}
      <div className="flex items-center gap-3">
        {/* QR Scanner trigger */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/35 hover:bg-cyan-500/20 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          Scan QR Tag
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-glass bg-glass text-slate-400 hover:text-cyan-400 transition-all relative"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl p-4 text-slate-100 animate-scale-up z-50">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <span className="font-semibold text-sm">System Alerts</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono">
                  {notifications.length} Active
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  All equipment components operating under nominal parameters.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {notifications.map(n => {
                    let Icon = Bell;
                    let iconColor = 'text-cyan-400';
                    if (n.type === 'calibration') { Icon = Activity; iconColor = 'text-amber-400'; }
                    else if (n.type === 'stock') { Icon = ShieldAlert; iconColor = 'text-amber-500'; }
                    else if (n.type === 'breakdown') { Icon = AlertTriangle; iconColor = 'text-rose-400'; }

                    return (
                      <div 
                        key={n.id}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate(n.link);
                        }}
                        className="flex gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className={`mt-0.5 ${iconColor}`}><Icon className="w-4 h-4" /></div>
                        <div>
                          <p className="text-xs font-semibold">{n.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Preference toggler */}
        <ThemeToggle />
      </div>
    </header>
  );
};
