import React, { useState } from 'react';
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

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
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
    const newAllSessions = JSON.parse(JSON.stringify(sessions)); // Deep copy to prevent state mutation

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
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Adjust to start week on Monday
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
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => isCurrentMonth && handleDayClick(day)}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Planificador de Entrenamientos</h2>
            <button onClick={onBack} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                &larr; Volver al Inicio
            </button>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
                <h3 className="text-xl font-bold capitalize">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h3>
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