import React from 'react';

type BadgeType = 
  | 'Active' | 'Under Maintenance' | 'Out of Service' | 'Archived'
  | 'Pending' | 'In Progress' | 'Completed'
  | 'Low' | 'Medium' | 'High' | 'Critical'
  | 'Due Soon' | 'Overdue';

interface StatusBadgeProps {
  status: BadgeType | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bgStyle = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  
  switch (status) {
    case 'Active':
    case 'Completed':
      bgStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      break;
      
    case 'Under Maintenance':
    case 'In Progress':
    case 'Medium':
    case 'Due Soon':
      bgStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      break;
      
    case 'Out of Service':
    case 'Critical':
    case 'Overdue':
      bgStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      break;
      
    case 'High':
      bgStyle = 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      break;
      
    case 'Low':
    case 'Pending':
      bgStyle = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      break;

    case 'Archived':
      bgStyle = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bgStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
      {status}
    </span>
  );
};
