import React, { useState, useEffect } from 'react';
import { Sun, Moon, Check } from 'lucide-react';

interface ThemeSelectorModalProps {
  onSelectTheme: (theme: 'dark' | 'light') => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ onSelectTheme }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already made a selection
    const selected = localStorage.getItem('biotrack_theme_selected');
    if (!selected) {
      setIsOpen(true);
    }
  }, []);

  const handleSelect = (theme: 'dark' | 'light') => {
    localStorage.setItem('biotrack_theme_selected', 'true');
    localStorage.setItem('biotrack_theme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    
    onSelectTheme(theme);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md p-8 border border-white/10 rounded-3xl bg-slate-900/90 text-white shadow-2xl animate-scale-up">
        <h2 className="text-2xl font-bold text-center mb-2">Welcome to BioTrack</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          Please select your preferred interface theme. You can modify this option anytime inside your profile settings.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Dark Mode option */}
          <button
            onClick={() => handleSelect('dark')}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-white/10 bg-slate-950/40 hover:border-cyan-500/50 hover:bg-slate-950/60 transition-all group"
          >
            <div className="p-4 rounded-full bg-slate-800 text-cyan-400 group-hover:scale-110 transition-transform">
              <Moon className="w-8 h-8" />
            </div>
            <span className="font-semibold text-sm">Dark Theme (Default)</span>
          </button>

          {/* Light Mode option */}
          <button
            onClick={() => handleSelect('light')}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-white/10 bg-slate-950/40 hover:border-violet-500/50 hover:bg-slate-950/60 transition-all group"
          >
            <div className="p-4 rounded-full bg-slate-850 text-violet-400 group-hover:scale-110 transition-transform">
              <Sun className="w-8 h-8" />
            </div>
            <span className="font-semibold text-sm">Light Theme</span>
          </button>
        </div>
      </div>
    </div>
  );
};
