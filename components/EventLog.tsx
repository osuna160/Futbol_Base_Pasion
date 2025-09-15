import React, { useState } from 'react';
import type { Team, MatchEvent } from '../types';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from './icons';
import { CardIcon, BallIcon } from './icons';

interface EventLogProps {
  events: MatchEvent[];
  teamA: Team;
  teamB: Team;
}

const EventIcon: React.FC<{ type: MatchEvent['type'] }> = ({ type }) => {
    switch (type) {
        case 'GOAL':
            return <BallIcon className="w-4 h-4 text-white" />;
        case 'YELLOW_CARD':
            return <div className="w-3 h-4 bg-yellow-400 border border-black rounded-sm" />;
        case 'RED_CARD':
            return <div className="w-3 h-4 bg-red-500 border border-black rounded-sm" />;
        case 'SUBSTITUTION':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
        default:
            return null;
    }
};

const EventItem: React.FC<{ event: MatchEvent, teamA: Team, teamB: Team }> = ({ event, teamA, teamB }) => {
    const teamColor = event.teamId === 'a' ? 'border-blue-500' : 'border-pink-500';

    return (
        <div className={`flex items-start gap-3 p-2 bg-gray-700/60 rounded-md border-l-4 ${teamColor}`}>
            <div className="font-bold text-md w-12 text-center text-gray-300 pt-1">{event.minute}'</div>
            <div className="flex-shrink-0 pt-1.5">
                <EventIcon type={event.type} />
            </div>
            <div className="flex-grow">
                <p className="font-semibold">{event.teamName}</p>
                <p className="text-sm text-gray-300">{event.detail}</p>
            </div>
        </div>
    );
};

const EventLog: React.FC<EventLogProps> = ({ events, teamA, teamB }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left font-bold text-lg p-2 rounded hover:bg-gray-700/50 flex justify-between items-center transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-cyan-400">Minuto a Minuto ({events.length})</span>
        <ChevronDownIcon className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mt-4 animate-fade-in">
          <div className="space-y-3 max-h-[400px] overflow-y-auto p-2 bg-gray-900/50 rounded-md">
            {events.length > 0 ? (
                [...events].reverse().map((event, index) => <EventItem key={index} event={event} teamA={teamA} teamB={teamB} />)
            ) : (
                <p className="text-gray-500 text-center p-4">No hay eventos registrados.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventLog;
