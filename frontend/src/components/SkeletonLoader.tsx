import React from 'react';

export const StatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 animate-pulse">
          <div className="w-1/2 h-3 bg-slate-800 rounded mb-3"></div>
          <div className="w-3/4 h-8 bg-slate-800 rounded mb-2"></div>
          <div className="w-1/3 h-3 bg-slate-800 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 animate-pulse">
      <div className="w-1/3 h-5 bg-slate-800 rounded mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-slate-800 rounded"></div>
        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
        <div className="h-4 bg-slate-800 rounded w-2/3"></div>
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/30 animate-pulse">
      <div className="h-12 bg-slate-900/60 border-b border-white/5 flex items-center px-6">
        <div className="w-full grid grid-cols-5 gap-4">
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
          <div className="h-4 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 flex items-center px-6">
            <div className="w-full grid grid-cols-5 gap-4">
              <div className="h-4 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
              <div className="h-4 bg-slate-800 rounded w-4/5"></div>
              <div className="h-4 bg-slate-800 rounded w-1/3"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
