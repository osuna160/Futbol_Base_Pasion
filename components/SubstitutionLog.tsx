import React, { useState } from 'react';
import type { Team, SubstitutionEvent, TeamId } from '../types';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from './icons';

interface SubstitutionLogProps {
  substitutionLog: SubstitutionEvent[];
  teamA: Team;
  teamB: Team;
}

const SubstitutionItem: React.FC<{ sub: SubstitutionEvent }> = ({ sub }) => (
    <div className="flex items-start gap-3 p-2 bg-gray-700/60 rounded-md">
        <div className="font-bold text-md w-12 text-center text-gray-300 pt-1">{sub.minute}'</div>
        <div className="flex-grow border-l border-gray-600 pl-3">
            <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 text-red-400">
                    <ArrowDownIcon className="w-3 h-3"/>
                    <span>(#{sub.playerOut.number}) {sub.playerOut.name}</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                    <ArrowUpIcon className="w-3 h-3"/>
                    <span>(#{sub.playerIn.number}) {sub.playerIn.name}</span>
                </div>
            </div>
        </div>
    </div>
);


const SubstitutionLog: React.FC<SubstitutionLogProps> = ({ substitutionLog, teamA, teamB }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (substitutionLog.length === 0) {
    return null; // Don't render anything if there's no history
  }

  const teamALogs = substitutionLog.filter(sub => sub.teamId === 'a');
  const teamBLogs = substitutionLog.filter(sub => sub.teamId === 'b');

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left font-bold text-lg p-2 rounded hover:bg-gray-700/50 flex justify-between items-center transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-cyan-400">Historial de Cambios ({substitutionLog.length})</span>
        <ChevronDownIcon className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-fade-in">
          {/* Team A Column */}
          <div>
            <h3 className="font-bold text-lg mb-2 text-center text-blue-400">{teamA.name}</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto p-2 bg-gray-900/50 rounded-md">
                {teamALogs.length > 0 ? (
                    teamALogs.map((sub, index) => <SubstitutionItem key={`sub-a-${index}`} sub={sub} />)
                ) : (
                    <p className="text-gray-500 text-center p-4">Sin cambios</p>
                )}
            </div>
          </div>
          {/* Team B Column */}
           <div>
            <h3 className="font-bold text-lg mb-2 text-center text-pink-400">{teamB.name}</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto p-2 bg-gray-900/50 rounded-md">
                {teamBLogs.length > 0 ? (
                    teamBLogs.map((sub, index) => <SubstitutionItem key={`sub-b-${index}`} sub={sub} />)
                ) : (
                    <p className="text-gray-500 text-center p-4">Sin cambios</p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubstitutionLog;