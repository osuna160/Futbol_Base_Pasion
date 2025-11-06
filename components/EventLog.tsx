import React from 'react';
import type { MatchEvent } from '../types';
import { BallIcon, CrosshairIcon, PencilIcon, TrashIcon, FlagIcon, CornerFlagIcon, WhistleIcon } from './icons';

const EventIcon: React.FC<{ type: MatchEvent['type'] }> = ({ type }) => {
    switch (type) {
        case 'GOAL':
            return <BallIcon className="w-4 h-4 text-white" />;
        case 'YELLOW_CARD':
            return <div className="w-3 h-4 bg-yellow-400 border border-black rounded-sm" />;
        case 'RED_CARD':
            return <div className="w-3 h-4 bg-red-500 border border-black rounded-sm" />;
        case 'GOAL_CHANCE':
            return <CrosshairIcon className="w-4 h-4 text-gray-300" />;
        case 'SUBSTITUTION':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
        case 'CORNER':
            return <CornerFlagIcon className="text-gray-300" />;
        case 'FOUL':
            return <WhistleIcon className="text-orange-400" />;
        case 'OFFSIDE':
            return <FlagIcon className="text-gray-300" />;
        default:
            return null;
    }
};

const EventItem: React.FC<{ event: MatchEvent; onEdit: (event: MatchEvent) => void; onDelete: (event: MatchEvent) => void; }> = ({ event, onEdit, onDelete }) => {
    const teamColor = event.teamId === 'a' ? 'border-blue-500' : 'border-pink-500';

    return (
        <div className={`flex items-start gap-3 p-2 bg-gray-700/60 rounded-md border-l-4 ${teamColor}`}>
            <div className="font-bold text-md w-12 text-center text-gray-300 pt-1">{event.minute}'</div>
            <div className="flex-shrink-0 pt-1.5">
                <EventIcon type={event.type} />
            </div>
            <div className="flex-grow">
                <p className="font-semibold text-sm">{event.teamName}</p>
                <p className="text-xs text-gray-300">{event.detail}</p>
            </div>
            <div className="flex gap-1 items-center">
                <button onClick={() => onEdit(event)} className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-600 transition-colors" title="Editar evento">
                    <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(event)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600 transition-colors" title="Eliminar evento">
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

interface EventLogProps {
  events: MatchEvent[];
  onEditEvent: (event: MatchEvent) => void;
  onDeleteEvent: (event: MatchEvent) => void;
}

const EventLog: React.FC<EventLogProps> = ({ events, onEditEvent, onDeleteEvent }) => {
  const sortedEvents = [...events].reverse();

  return (
    <div className="space-y-2 overflow-y-auto pr-2 -mr-4 flex-grow max-h-[600px]">
      {sortedEvents.length > 0 ? (
        sortedEvents.map((event) => <EventItem key={event.id} event={event} onEdit={onEditEvent} onDelete={onDeleteEvent} />)
      ) : (
        <p className="text-gray-500 text-center p-8">No hay eventos registrados.</p>
      )}
    </div>
  );
};

export default EventLog;