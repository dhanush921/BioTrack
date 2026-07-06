import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalIcon, ChevronLeft, ChevronRight, 
  Wrench, Activity, Clock, Info, CalendarDays
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';

interface CalendarEvent {
  id: string;
  type: 'PM' | 'Calibration';
  title: string;
  date: string; // YYYY-MM-DD
  status: string;
  technician: string;
  details: string;
}

export const CalendarView: React.FC = () => {
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filterType, setFilterType] = useState<'All' | 'PM' | 'Calibration'>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const [pmList, calList] = await Promise.all([
          api.get('/maintenance'),
          api.get('/calibration')
        ]);

        const compiledEvents: CalendarEvent[] = [
          ...pmList.map((p: any) => ({
            id: p.id,
            type: 'PM' as const,
            title: `PM: ${p.equipmentName}`,
            date: p.scheduledDate,
            status: p.status,
            technician: p.assignedTechnician,
            details: `Frequency: ${p.frequency}. Notes: ${p.notes}`
          })),
          ...calList.map((c: any) => ({
            id: c.id,
            type: 'Calibration' as const,
            title: `Calib: ${c.equipmentName}`,
            date: c.calibrationDate,
            status: c.status,
            technician: c.performedBy,
            details: `Cert: ${c.certificateNumber}. Notes: ${c.notes}`
          }))
        ];
        setEvents(compiledEvents);
      } catch (e) {
        toast.error('Failed to load schedule telemetry for calendar.');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  // Calendar Math Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  // Create calendar cells array (grid of 35 or 42 cells)
  const calendarCells: { dateString: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  // 1. Fill previous month dates
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    calendarCells.push({
      dateString: `${y}-${monthStr}-${dayStr}`,
      dayNumber: d,
      isCurrentMonth: false
    });
  }

  // 2. Fill current month dates
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    calendarCells.push({
      dateString: `${year}-${monthStr}-${dayStr}`,
      dayNumber: d,
      isCurrentMonth: true
    });
  }

  // 3. Fill next month cells to complete grid row (multiple of 7)
  const totalCells = Math.ceil(calendarCells.length / 7) * 7;
  const nextMonthFillCount = totalCells - calendarCells.length;
  for (let d = 1; d <= nextMonthFillCount; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    calendarCells.push({
      dateString: `${y}-${monthStr}-${dayStr}`,
      dayNumber: d,
      isCurrentMonth: false
    });
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const getEventsForDate = (dateString: string) => {
    return events.filter(e => {
      const matchesType = filterType === 'All' || e.type === filterType;
      return e.date === dateString && matchesType;
    });
  };

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Compliance Schedule Calendar</h1>
            <p className="text-slate-400 text-sm mt-1">Timeline of calibration tasks and preventive service sessions.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 bg-slate-900/40 border border-white/5 p-1 rounded-xl w-fit">
          {['All', 'PM', 'Calibration'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${filterType === type 
                  ? 'bg-cyan-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid Container */}
      <GlassCard className="border-white/5 bg-slate-900/40 p-6 space-y-4">
        {/* Month Selector header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <h3 className="font-bold text-lg text-slate-200">
            {monthNames[month]} {year}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 rounded-xl border border-glass bg-glass text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 border border-glass bg-glass rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 rounded-xl border border-glass bg-glass text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week Days Headers */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 border-b border-white/5 pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            const dayEvents = getEventsForDate(cell.dateString);
            const isToday = cell.dateString === new Date().toISOString().split('T')[0];

            return (
              <div
                key={idx}
                className={`
                  min-h-[90px] border border-white/5 rounded-xl p-2 flex flex-col justify-between transition-all
                  ${cell.isCurrentMonth ? 'bg-slate-950/20' : 'bg-slate-950/5 opacity-40'}
                  ${isToday ? 'ring-1 ring-cyan-500/50 border-cyan-500/20 bg-cyan-500/5' : ''}
                `}
              >
                <span className={`text-xs font-semibold ${isToday ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                  {cell.dayNumber}
                </span>

                {/* Event indicators */}
                <div className="space-y-1 mt-1 flex-1 overflow-y-auto">
                  {dayEvents.map(event => {
                    const isPM = event.type === 'PM';
                    return (
                      <div
                        key={event.id}
                        onClick={() => toast.info(`${event.title}\n${event.details}\nTechnician: ${event.technician}`)}
                        className={`
                          p-1 rounded text-[9px] font-medium border truncate cursor-pointer transition-colors
                          ${isPM 
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20' 
                            : 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20'}
                        `}
                        title={event.details}
                      >
                        {isPM ? '🔧 ' : '⚡ '}
                        {event.title.substring(4)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};
