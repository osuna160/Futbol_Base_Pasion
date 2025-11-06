import React, { useState, useMemo } from 'react';
import type { TrainingSession, RosterPlayer } from '../types';
import SessionModal from './SessionModal';

interface TrainingDashboardProps {
  sessions: Record<string, TrainingSession[]>;
  onSessionsChange: (sessions: Record<string, TrainingSession[]>) => void;
  onBack: () => void;
  roster: RosterPlayer[];
}

const TrainingDashboard: React.FC<TrainingDashboardProps> = ({ sessions, onSessionsChange, onBack, roster }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('es-ES', { month: 'long' })), []);
  
  const years = useMemo(() => {
    const sessionYears = Object.keys(sessions).map(dateKey => new Date(dateKey).getFullYear());
    const currentYear = new Date().getFullYear();
    const allYears = new Set([currentYear - 1, currentYear, currentYear + 1, ...sessionYears]);
    return Array.from(allYears).sort((a, b) => a - b);
  }, [sessions]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newMonth);
        return newDate;
    });
  };
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setFullYear(newYear);
        return newDate;
    });
  };
  
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleSessionsSave = (date: Date, newSessionsForDay: TrainingSession[]) => {
    const dateKey = date.toISOString().split('T')[0];
    const newAllSessions = JSON.parse(JSON.stringify(sessions));

    if (newSessionsForDay.length > 0) {
      newAllSessions[dateKey] = newSessionsForDay;
    } else {
      delete newAllSessions[dateKey];
    }
    onSessionsChange(newAllSessions);
    handleModalClose();
  };
  
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayIndex);
    
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
        days.push(new Date(startDate));
        startDate.setDate(startDate.getDate() + 1);
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);

    return days.map((day, index) => {
        const dateKey = day.toISOString().split('T')[0];
        const daySessions = sessions[dateKey] || [];
        const isCurrentMonth = day.getMonth() === month;
        const isToday = day.getTime() === today.getTime();

        return (
            <div 
                key={index}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${daySessions.length > 0 ? 'has-events' : ''}`}
                onClick={() => isCurrentMonth && handleDayClick(day)}
                title={daySessions.length > 0 ? `${daySessions.length} sesión(es)` : 'Añadir sesión'}
            >
                <span className="calendar-day-number">{day.getDate()}</span>
                {daySessions.length > 0 && (
                    <div className="event-indicator">
                        {daySessions.slice(0,3).map(s => <div key={s.id} className="event-dot"></div>)}
                    </div>
                )}
            </div>
        );
    });
  };

  return (
    <div className="bg-gray-800 p-4 sm:p-6 rounded-lg max-w-4xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--secondary-color)]">Planificador de Entrenamientos</h2>
            <button onClick={onBack} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                &larr; Volver al Inicio
            </button>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
                <div className="flex items-center gap-2">
                    <select value={currentDate.getMonth()} onChange={handleMonthChange} className="bg-gray-700 text-white font-semibold py-2 px-3 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer">
                        {months.map((m, i) => <option key={i} value={i} className="capitalize">{m}</option>)}
                    </select>
                     <select value={currentDate.getFullYear()} onChange={handleYearChange} className="bg-gray-700 text-white font-semibold py-2 px-3 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-400 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="calendar-grid">
                {renderCalendar()}
            </div>
        </div>

        {isModalOpen && selectedDate && (
            <SessionModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                date={selectedDate}
                sessions={sessions[selectedDate.toISOString().split('T')[0]] || []}
                onSave={handleSessionsSave}
                roster={roster}
            />
        )}
    </div>
  );
};
export default TrainingDashboard;