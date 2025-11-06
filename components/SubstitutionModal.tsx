import React, { useState, useEffect } from 'react';
import type { Team, Player } from '../types';

interface SubstitutionModalProps {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
  onConfirm: (subs: { playerOutId: number, playerInId: number }[]) => void;
}

const SubstitutionModal: React.FC<SubstitutionModalProps> = ({ isOpen, team, onClose, onConfirm }) => {
  const [selectedOutId, setSelectedOutId] = useState<number | null>(null);
  const [selectedInId, setSelectedInId] = useState<number | null>(null);
  const [pendingSubs, setPendingSubs] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setSelectedOutId(null);
      setSelectedInId(null);
      setPendingSubs(new Map());
    }
  }, [isOpen]);

  if (!isOpen || !team) return null;

  const pendingOutIds = Array.from(pendingSubs.keys());
  const pendingInIds = Array.from(pendingSubs.values());

  const availableStarters = team.starters.filter(p => !pendingOutIds.includes(p.id) && !p.isSentOff);
  const availableSubs = team.subs.filter(p => !p.isOnField && !p.isSentOff && !pendingInIds.includes(p.id));

  const handleAddPair = () => {
    if (selectedOutId !== null && selectedInId !== null) {
      const newPendingSubs = new Map(pendingSubs);
      newPendingSubs.set(selectedOutId, selectedInId);
      setPendingSubs(newPendingSubs);
      setSelectedOutId(null);
      setSelectedInId(null);
    }
  };

  const handleRemovePair = (playerOutId: number) => {
    const newPendingSubs = new Map(pendingSubs);
    newPendingSubs.delete(playerOutId);
    setPendingSubs(newPendingSubs);
  };
  
  const handleConfirm = () => {
    const subsArray = Array.from(pendingSubs.entries()).map(([playerOutId, playerInId]) => ({ playerOutId, playerInId }));
    if (subsArray.length > 0) {
      onConfirm(subsArray);
    } else {
      onClose(); // Close if no changes were confirmed
    }
  };

  const getPlayerById = (id: number): Player | undefined => {
    return [...team.starters, ...team.subs].find(p => p.id === id);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl shadow-xl flex flex-col h-auto max-h-[90vh]">
        <div className="flex-shrink-0">
            <h2 className="text-2xl font-bold mb-4">Realizar Sustituciones - {team.name}</h2>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-4">
            {/* Pending Subs */}
            <div className="mb-6">
                <h3 className="font-bold text-lg mb-2 text-cyan-400">Cambios Pendientes ({pendingSubs.size})</h3>
                <div className="bg-gray-900/50 p-3 rounded-md min-h-[6rem] max-h-48 overflow-y-auto">
                    {pendingSubs.size === 0 ? (
                        <p className="text-gray-400 h-full flex items-center justify-center">Selecciona una jugadora del campo y del banquillo para añadir un cambio.</p>
                    ) : (
                        <div className="space-y-2">
                            {Array.from(pendingSubs.entries()).map(([outId, inId]) => {
                                const pOut = getPlayerById(outId);
                                const pIn = getPlayerById(inId);
                                return (
                                    <div key={outId} className="flex items-center justify-between bg-gray-700/80 p-2 rounded-md animate-fade-in">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-red-400">SALE</p>
                                                <p>{pOut ? `(#${pOut.number}) ${pOut.name}` : '...'}</p>
                                            </div>
                                            <p className="text-2xl font-thin text-gray-400">→</p>
                                            <div>
                                                <p className="text-sm font-semibold text-green-400">ENTRA</p>
                                                <p>{pIn ? `(#${pIn.number}) ${pIn.name}` : '...'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemovePair(outId)} className="text-gray-400 hover:text-white font-bold text-2xl px-2">&times;</button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Player Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-2 text-yellow-300">En el Campo</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto p-1 bg-gray-900/50 rounded">
                    {availableStarters.map(p => (
                        <button key={p.id} onClick={() => setSelectedOutId(p.id)} className={`w-full text-left p-2 rounded transition-all ${selectedOutId === p.id ? 'ring-2 ring-blue-400 bg-blue-900/50 font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            {`(#${p.number}) ${p.name}`}
                        </button>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-green-300">En el Banquillo</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto p-1 bg-gray-900/50 rounded">
                    {availableSubs.map(p => (
                        <button key={p.id} onClick={() => setSelectedInId(p.id)} className={`w-full text-left p-2 rounded transition-all ${selectedInId === p.id ? 'ring-2 ring-green-400 bg-green-900/50 font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            {`(#${p.number}) ${p.name}`}
                        </button>
                    ))}
                </div>
              </div>
            </div>
        </div>

        <div className="flex-shrink-0 mt-6 pt-4 border-t border-gray-700 flex justify-between items-center gap-4">
            <button 
                onClick={handleAddPair} 
                disabled={selectedInId === null || selectedOutId === null} 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
                Añadir Cambio
            </button>
            <div className="flex gap-4">
                <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors">Cancelar</button>
                <button 
                    onClick={handleConfirm} 
                    disabled={pendingSubs.size === 0} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    Confirmar {pendingSubs.size > 0 ? `${pendingSubs.size} Cambio${pendingSubs.size > 1 ? 's' : ''}` : 'Cambios'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionModal;