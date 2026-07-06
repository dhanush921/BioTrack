import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick, 
  hoverEffect = false 
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border bg-glass border-glass shadow-glass p-6 text-slate-800 dark:text-slate-100
        ${onClick ? 'cursor-pointer select-none' : ''}
        ${hoverEffect ? 'hover-glass-trigger' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
