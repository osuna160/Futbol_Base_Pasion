import React, { useState, useEffect } from 'react';
import type { RosterPlayer } from '../types';
import { TrashIcon, PlusCircleIcon } from './icons';

interface TeamRosterProps {
  roster: RosterPlayer[];
  onRosterChange: (roster: RosterPlayer[]) => void;
  onBack: () => void;
}

const TeamRoster: React.FC<TeamRosterProps> = ({ roster, onRosterChange, onBack }) => {
  const [localRoster, setLocalRoster] = useState<RosterPlayer[]>([]);

  useEffect(() => {
    // Deep copy to avoid direct mutation of props
    setLocalRoster(JSON.parse(JSON.stringify(roster)));
  }, [roster]);

  const handlePlayerChange = (id: number, field: 'name' | 'number', value: string | number) => {
    setLocalRoster(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleAddPlayer = () => {
    const newPlayer: RosterPlayer = {
      id: Date.now(),
      name: '',
      number: 0,
    };
    setLocalRoster(prev => [...prev, newPlayer]);
  };

  const handleRemovePlayer = (id: number) => {
    setLocalRoster(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveChanges = () => {
    // Filter out empty players before saving
    const cleanedRoster = localRoster.filter(p => p.name.trim() !== '' && p.number > 0);
    onRosterChange(cleanedRoster);
    onBack(); // Go back after saving
  };

  return (
    <div className="bg-gray-800 p-4 sm:p-6 rounded-lg max-w-3xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Gestionar Plantilla</h2>
        <button onClick={onBack} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            &larr; Volver al Inicio
        </button>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {localRoster.map((player) => (
          <div key={player.id} className="flex items-center gap-3 bg-gray-700 p-2 rounded-md">
            <input
              type="number"
              placeholder="#"
              value={player.number || ''}
              onChange={(e) => handlePlayerChange(player.id, 'number', parseInt(e.target.value) || 0)}
              className="bg-gray-600 w-20 text-center rounded p-2 font-semibold"
            />
            <input
              type="text"
              placeholder="Nombre de la jugadora"
              value={player.name}
              onChange={(e) => handlePlayerChange(player.id, 'name', e.target.value)}
              className="bg-gray-600 flex-grow rounded p-2"
            />
            <button
              onClick={() => handleRemovePlayer(player.id)}
              className="text-red-400 hover:text-red-300 p-2"
              title="Eliminar Jugadora"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-gray-700 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
         <button
          onClick={handleAddPlayer}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          <PlusCircleIcon />
          Añadir Jugadora
        </button>
        <button
          onClick={handleSaveChanges}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-lg transition-transform hover:scale-105"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default TeamRoster;