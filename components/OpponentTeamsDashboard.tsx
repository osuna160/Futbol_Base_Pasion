import React, { useState, useRef } from 'react';
import type { OpponentTeam, OpponentPlayer } from '../types';
import { TrashIcon, PencilIcon, PlusCircleIcon, MinusCircleIcon, ArrowUpTrayIcon } from './icons';

// Make SheetJS (xlsx) available from CDN
declare const XLSX: any;

interface OpponentTeamsDashboardProps {
  opponentTeams: OpponentTeam[];
  onOpponentTeamsChange: (teams: OpponentTeam[]) => void;
}

const OpponentTeamsDashboard: React.FC<OpponentTeamsDashboardProps> = ({ opponentTeams, onOpponentTeamsChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<OpponentTeam | null>(null);

  const openModal = (team: OpponentTeam | null) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
  };

  const handleSaveTeam = (team: OpponentTeam) => {
    if (editingTeam) {
      // Update
      onOpponentTeamsChange(opponentTeams.map(t => t.id === team.id ? team : t));
    } else {
      // Create
      onOpponentTeamsChange([...opponentTeams, { ...team, id: Date.now() }]);
    }
    closeModal();
  };

  const handleDeleteTeam = (teamId: number) => {
    if (window.confirm('¿Seguro que quieres eliminar este equipo?')) {
      onOpponentTeamsChange(opponentTeams.filter(t => t.id !== teamId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestor de Equipos Rivales</h2>
        <button
          onClick={() => openModal(null)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          + Añadir Equipo
        </button>
      </div>
      
      {opponentTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opponentTeams.map(team => (
            <div key={team.id} className="bg-gray-700/50 p-4 rounded-lg flex flex-col">
              <div className="flex items-center gap-4 mb-3">
                {team.crest ? (
                  <img src={team.crest} alt={team.name} className="w-16 h-16 rounded-full object-cover bg-gray-800" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-2xl">
                    {team.name.charAt(0)}
                  </div>
                )}
                <h3 className="font-bold text-lg flex-grow">{team.name}</h3>
              </div>
              <div className="text-sm text-gray-300 flex-grow">
                <p>Jugadoras: {team.players.length}</p>
                <p>1er Entrenador: {team.staff.firstCoach || '-'}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 border-t border-gray-600 pt-3">
                <button onClick={() => openModal(team)} className="bg-blue-600 hover:bg-blue-700 p-2 rounded" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteTeam(team.id)} className="bg-red-600 hover:bg-red-700 p-2 rounded" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-900/50 rounded-lg">
          <h3 className="text-xl font-semibold">No hay equipos rivales</h3>
          <p className="text-gray-400 mt-2">Añade tu primer equipo rival para empezar a gestionar plantillas.</p>
        </div>
      )}

      {isModalOpen && (
        <OpponentTeamModal
          team={editingTeam}
          onClose={closeModal}
          onSave={handleSaveTeam}
        />
      )}
    </div>
  );
};

interface OpponentTeamModalProps {
    team: OpponentTeam | null;
    onClose: () => void;
    onSave: (team: OpponentTeam) => void;
}

const OpponentTeamModal: React.FC<OpponentTeamModalProps> = ({ team, onClose, onSave }) => {
    const [localTeam, setLocalTeam] = useState<Omit<OpponentTeam, 'id'>>(
        team || {
            name: '',
            crest: undefined,
            players: [],
            staff: { firstCoach: '', secondCoach: '', delegate: '', physio: '' }
        }
    );
    const crestInputRef = useRef<HTMLInputElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const handleChange = (field: keyof Omit<OpponentTeam, 'id'>, value: any) => {
        setLocalTeam(prev => ({ ...prev, [field]: value }));
    };

    const handleStaffChange = (field: keyof OpponentTeam['staff'], value: string) => {
        setLocalTeam(prev => ({ ...prev, staff: { ...prev.staff, [field]: value } }));
    };

    const handlePlayerChange = (playerId: number, field: keyof OpponentPlayer, value: string | number) => {
        setLocalTeam(prev => ({
            ...prev,
            players: prev.players.map(p => p.id === playerId ? { ...p, [field]: value } : p)
        }));
    };

    const handleAddPlayer = () => {
        const newPlayer: OpponentPlayer = { id: Date.now(), name: '', number: 0 };
        setLocalTeam(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
    };

    const handleRemovePlayer = (playerId: number) => {
        setLocalTeam(prev => ({ ...prev, players: prev.players.filter(p => p.id !== playerId) }));
    };

    const handleCrestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setLocalTeam(prev => ({ ...prev, crest: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (localTeam.name.trim()) {
            onSave({ ...localTeam, id: team?.id || 0 });
        }
    };

    const handleImportClick = () => {
        importFileRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length > 0) {
                    const findHeader = (row: any, potentialNames: string[]): any | undefined => {
                        const rowKeys = Object.keys(row);
                        for (const name of potentialNames) {
                            const foundKey = rowKeys.find(key => key.toLowerCase().trim() === name.toLowerCase());
                            if (foundKey) return row[foundKey];
                        }
                        return undefined;
                    };

                    const newPlayers: OpponentPlayer[] = json.map((row, index): OpponentPlayer | null => {
                        const name = findHeader(row, ['nombre', 'jugadora', 'name']);
                        const numberStr = findHeader(row, ['dorsal', 'numero', 'número', '#', 'number']);
                        
                        if (!name || !numberStr) return null;

                        const number = parseInt(String(numberStr), 10);

                        return {
                            id: Date.now() + index,
                            name: String(name),
                            number: isNaN(number) ? 0 : number,
                        };
                    }).filter((p: OpponentPlayer | null): p is OpponentPlayer => p !== null && !!p.name && p.number > 0);

                    if (newPlayers.length > 0) {
                        setLocalTeam(prev => ({ ...prev, players: newPlayers }));
                        alert(`${newPlayers.length} jugadoras importadas correctamente.`);
                    } else {
                        alert("No se encontraron jugadoras válidas. Asegúrate de que las columnas 'Nombre' y 'Dorsal' existan.");
                    }
                } else {
                    alert('El archivo Excel está vacío.');
                }
            } catch (error) {
                console.error("Error al importar el archivo Excel:", error);
                alert("Hubo un error al procesar el archivo. Asegúrate de que es un archivo .xlsx válido.");
            }
        };
        reader.onerror = (err) => {
            console.error("Error al leer el archivo:", err);
            alert("No se pudo leer el archivo.");
        };
        reader.readAsArrayBuffer(file);

        if (event.target) {
            event.target.value = ''; // Reset input
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl shadow-xl flex flex-col h-auto max-h-[90vh]">
                <h2 className="text-2xl font-bold mb-4">{team ? 'Editar' : 'Añadir'} Equipo Rival</h2>
                <div className="flex-grow overflow-y-auto pr-2 -mr-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <input type="file" ref={crestInputRef} onChange={handleCrestChange} accept="image/*" className="hidden" />
                        <button onClick={() => crestInputRef.current?.click()} className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0" title="Cambiar escudo">
                            {localTeam.crest ? <img src={localTeam.crest} alt="Escudo" className="w-full h-full object-cover rounded-full" /> : <span className="text-gray-400">Escudo</span>}
                        </button>
                        <input type="text" placeholder="Nombre del Equipo" value={localTeam.name} onChange={e => handleChange('name', e.target.value)} className="input-field text-xl font-semibold flex-grow" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-cyan-400">Staff Técnico</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input type="text" placeholder="1er Entrenador/a" value={localTeam.staff.firstCoach} onChange={e => handleStaffChange('firstCoach', e.target.value)} className="input-field" />
                            <input type="text" placeholder="2º Entrenador/a" value={localTeam.staff.secondCoach} onChange={e => handleStaffChange('secondCoach', e.target.value)} className="input-field" />
                            <input type="text" placeholder="Delegado/a" value={localTeam.staff.delegate} onChange={e => handleStaffChange('delegate', e.target.value)} className="input-field" />
                            <input type="text" placeholder="Fisio" value={localTeam.staff.physio} onChange={e => handleStaffChange('physio', e.target.value)} className="input-field" />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-lg text-cyan-400">Plantilla</h3>
                          <button
                            onClick={handleImportClick}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-1 px-3 rounded-lg transition-colors text-sm inline-flex items-center gap-2"
                            title="Importar desde Excel (.xlsx). Columnas: Nombre, Dorsal"
                           >
                            <ArrowUpTrayIcon className="w-4 h-4" /> Importar
                          </button>
                        </div>
                        <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".xlsx" className="hidden"/>
                        <div className="space-y-2 bg-gray-900/50 p-2 rounded-md max-h-60 overflow-y-auto">
                            {localTeam.players.map(player => (
                                <div key={player.id} className="flex items-center gap-2">
                                    <input type="number" placeholder="#" value={player.number || ''} onChange={e => handlePlayerChange(player.id, 'number', parseInt(e.target.value) || 0)} className="bg-gray-700 w-16 text-center rounded p-1" />
                                    <input type="text" placeholder="Nombre de la jugadora" value={player.name} onChange={e => handlePlayerChange(player.id, 'name', e.target.value)} className="bg-gray-700 flex-grow rounded p-1" />
                                    <button onClick={() => handleRemovePlayer(player.id)} className="text-red-400 hover:text-red-300 p-1"><MinusCircleIcon /></button>
                                </div>
                            ))}
                            <button onClick={handleAddPlayer} className="w-full text-sm py-1 px-2 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center gap-1"><PlusCircleIcon /> Añadir jugadora</button>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-700 flex-shrink-0">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded">Guardar Equipo</button>
                </div>
            </div>
        </div>
    );
};

export default OpponentTeamsDashboard;