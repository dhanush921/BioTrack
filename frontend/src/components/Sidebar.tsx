import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, HardDrive, Wrench, AlertOctagon, 
  Activity, Box, BrainCircuit, FileBarChart, 
  ShieldCheck, LogOut, User, Menu, FileText, BarChart3, Calendar
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Administrator', 'Biomedical Engineer', 'Technician', 'Department Staff'] },
    { name: 'Equipment Register', path: '/equipment', icon: HardDrive, roles: ['Administrator', 'Biomedical Engineer', 'Technician', 'Department Staff'] },
    { name: 'Preventive Maintenance', path: '/maintenance', icon: Wrench, roles: ['Administrator', 'Biomedical Engineer', 'Technician'] },
    { name: 'Breakdown Tickets', path: '/breakdowns', icon: AlertOctagon, roles: ['Administrator', 'Biomedical Engineer', 'Technician', 'Department Staff'] },
    { name: 'Calibration Logs', path: '/calibration', icon: Activity, roles: ['Administrator', 'Biomedical Engineer', 'Technician'] },
    { name: 'Spare Parts Inventory', path: '/inventory', icon: Box, roles: ['Administrator', 'Biomedical Engineer', 'Technician'] },
    { name: 'AMC / CMC Contracts', path: '/contracts', icon: FileText, roles: ['Administrator', 'Biomedical Engineer', 'Technician', 'Department Staff'] },
    { name: 'System Analytics', path: '/analytics', icon: BarChart3, roles: ['Administrator', 'Biomedical Engineer', 'Technician', 'Department Staff'] },
    { name: 'Compliance Calendar', path: '/calendar', icon: Calendar, roles: ['Administrator', 'Biomedical Engineer', 'Technician', 'Department Staff'] },
    { name: 'AI Insights', path: '/ai', icon: BrainCircuit, roles: ['Administrator', 'Biomedical Engineer', 'Technician'] },
    { name: 'Export Reports', path: '/reports', icon: FileBarChart, roles: ['Administrator', 'Biomedical Engineer'] },
    { name: 'Admin Panel', path: '/admin', icon: ShieldCheck, roles: ['Administrator'] },
  ];

  const filteredItems = menuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r border-glass bg-glass shadow-glass flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md">
              B
            </div>
            <span className="font-bold text-lg tracking-wider text-slate-850 dark:text-slate-100">
              BIOTRACK
            </span>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {filteredItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border
                  ${isActive 
                    ? 'bg-gradient-to-r from-cyan-500/10 to-violet-600/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}
                `}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Profile Card & Logout */}
        {user && (
          <div className="p-4 border-t border-white/5 bg-slate-950/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-inner">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <NavLink 
                to="/profile"
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-white/5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <User className="w-3 h-3" />
                Profile
              </NavLink>
              <button 
                onClick={logout}
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-rose-500/10 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
