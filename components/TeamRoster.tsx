import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { RosterPlayer, Match, MatchType, AggregatedPlayerStats, TeamSettings } from '../types';
import { TrashIcon, PlusCircleIcon, ArrowUpTrayIcon, ChevronDownIcon, PhotoPlaceholderIcon } from './icons';
import { MatchState, MATCH_TYPES } from '../types';
import { calculateMinutesPlayed } from './report-utils';
import { addMedia, getMedia, deleteMedia } from './db';

interface TeamRosterProps {
  roster: RosterPlayer[];
  matches: Match[];
  teamSettings: TeamSettings;
  onRosterChange: (roster: RosterPlayer[]) => void;
  onTeamSettingsChange: (settings: TeamSettings) => void;
  onBack: () => void;
  onImportRoster: (file: File) => void;
}

// Helper function to process, resize, and reconstruct an image file.
const processImageFile = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
        if (!isImage) {
            return reject(new Error('El archivo no es un tipo de imagen válido.'));
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error('No se pudo leer el archivo para procesarlo.'));
            }

            const img = new Image();
            img.src = event.target.result as string;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_DIMENSION = 1024;
                let { width, height } = img;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height = Math.round(height * (MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width = Math.round(width * (MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('No se pudo obtener el contexto del canvas.'));
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // Reconstruct the file with the correct MIME type
                            const newFile = new File([blob], file.name, { type: 'image/jpeg' });
                            resolve(newFile);
                        } else {
                            reject(new Error('Fallo al crear el blob desde el canvas.'));
                        }
                    },
                    'image/jpeg',
                    0.9
                );
            };
            img.onerror = () => reject(new Error('No se pudo cargar la imagen para procesarla.'));
        };
        reader.onerror = () => reject(new Error('Falló la lectura del archivo.'));
    });
};


const calculateAge = (dateString?: string): number | null => {
  if (!dateString) return null;
  try {
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return null; // Invalid date
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return null;
  }
};

const calculateAllPlayerStats = (playerId: number, matches: Match[]): AggregatedPlayerStats => {
    const initialStats: AggregatedPlayerStats = {
        gamesPlayed: 0, started: 0, subbedIn: 0, minutesPlayed: 0,
        bench: 0, unavailable: 0, notCalledUp: 0,
        goals: 0, yellowCards: 0, redCards: 0,
        goalsConceded: 0, saves: 0,
    };

    return matches.reduce((stats, match) => {
        if (match.matchState !== MatchState.FULL_TIME) return stats;

        const isMyTeamA = match.myTeamSetup.starters.some(p => p.playerId === playerId) || match.myTeamSetup.subs.some(p => p.id === playerId) || match.myTeamSetup.unavailable.some(p => p.id === playerId);
        
        if (!isMyTeamA) {
          // Fallback check, might be opponent team in some cases
          const isOpponent = match.opponentTeamSetup.starters.some(p => p.playerId === playerId);
          if (isOpponent) return stats;
        }

        const myTeam = isMyTeamA ? match.teamA : match.teamB;
        const myTeamSetup = isMyTeamA ? match.myTeamSetup : match.opponentTeamSetup;
        const myTeamId = isMyTeamA ? 'a' : 'b';

        const starterIds = new Set(myTeamSetup.starters.map(p => p.playerId));
        const subIds = new Set(myTeamSetup.subs.map(p => p.id));
        const unavailableIds = new Set(myTeamSetup.unavailable.map(p => p.id));

        const isInvolved = starterIds.has(playerId) || subIds.has(playerId) || unavailableIds.has(playerId);
        if (!isInvolved) {
            stats.notCalledUp++;
            return stats;
        }

        if (unavailableIds.has(playerId)) {
            stats.unavailable++;
            return stats;
        }
        
        if (!myTeam) return stats; // Match might not have been started

        stats.gamesPlayed++;

        const playerInMatch = [...myTeam.starters, ...myTeam.subs].find(p => p.id === playerId);
        const wasStarter = (isMyTeamA ? match.initialStartersA : match.initialStartersB).some(p => p.id === playerId);

        if(wasStarter) {
            stats.started++;
        }

        const subInEvent = match.substitutionLog.find(s => s.playerIn.id === playerId && s.teamId === myTeamId);

        if(subInEvent) {
            stats.subbedIn++;
        }
        
        const minutes = playerInMatch ? calculateMinutesPlayed(playerInMatch, match.substitutionLog, match.halfDurationMinutes, wasStarter) : 0;
        stats.minutesPlayed += minutes;
        
        if (!wasStarter && !subInEvent && minutes === 0) {
            stats.bench++;
        }
        
        if (playerInMatch) {
            stats.goals += playerInMatch.goals.length;
            stats.yellowCards += playerInMatch.yellowCards.length;
            stats.redCards += playerInMatch.redCard ? 1 : 0;
            if (playerInMatch.isGoalkeeper) {
                stats.goalsConceded += playerInMatch.goalsConceded.length;
                stats.saves += playerInMatch.saves.length;
            }
        }

        return stats;
    }, initialStats);
};


const PlayerStats: React.FC<{ stats: AggregatedPlayerStats }> = ({ stats }) => (
    <div className="bg-gray-800/70 p-3 mt-2 rounded-md grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm animate-fade-in">
        <div className="font-semibold">Minutos: <span className="font-normal text-white">{stats.minutesPlayed}'</span></div>
        <div className="font-semibold">Titular: <span className="font-normal text-white">{stats.started}</span></div>
        <div className="font-semibold">Suplente: <span className="font-normal text-white">{stats.subbedIn}</span></div>
        <div className="font-semibold">Banquillo: <span className="font-normal text-white">{stats.bench}</span></div>
        <div className="font-semibold">No Convocada: <span className="font-normal text-white">{stats.notCalledUp}</span></div>
        <div className="font-semibold">No Disponible: <span className="font-normal text-white">{stats.unavailable}</span></div>
        <div className="font-semibold text-yellow-300">Goles: <span className="font-normal text-white">{stats.goals}</span></div>
    </div>
);

const PlayerPhoto: React.FC<{ photoId?: string; alt: string }> = React.memo(({ photoId, alt }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
    
        const loadUrl = async () => {
            if (photoId) {
                try {
                    const blob = await getMedia(photoId);
                    if (blob) {
                        objectUrl = URL.createObjectURL(blob);
                        setImageUrl(objectUrl);
                    }
                } catch (error) {
                    console.error("Failed to load player photo:", error);
                    setImageUrl(null);
                }
            } else {
                setImageUrl(null);
            }
        };
    
        loadUrl();
    
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [photoId]);

    if (imageUrl) {
        return <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />;
    }
    return (
        <div className="w-full h-full flex items-center justify-center">
            <PhotoPlaceholderIcon className="w-6 h-6" />
        </div>
    );
});


const TeamRoster: React.FC<TeamRosterProps> = ({ roster, matches, teamSettings, onRosterChange, onTeamSettingsChange, onBack, onImportRoster }) => {
  const [localRoster, setLocalRoster] = useState<RosterPlayer[]>([]);
  const [statsFilter, setStatsFilter] = useState<MatchType | 'Todos'>('Todos');
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalRoster(JSON.parse(JSON.stringify(roster)));
  }, [roster]);

  const filteredMatches = useMemo(() => {
    if (statsFilter === 'Todos') return matches;
    return matches.filter(m => m.details.matchType === statsFilter);
  }, [matches, statsFilter]);

  const playerStats = useMemo(() => {
    const statsMap = new Map<number, AggregatedPlayerStats>();
    roster.forEach(player => {
      statsMap.set(player.id, calculateAllPlayerStats(player.id, filteredMatches));
    });
    return statsMap;
  }, [roster, filteredMatches]);

  const handlePlayerChange = (id: number, field: keyof RosterPlayer | 'availability.status' | 'availability.reason', value: any) => {
    setLocalRoster(prev =>
      prev.map(p => {
        if (p.id === id) {
          if (field.startsWith('availability.')) {
            const subField = field.split('.')[1] as 'status' | 'reason';
            const newAvailability = { ...p.availability, [subField]: value };
            if (subField === 'status' && value === 'Disponible') {
                 // Reset reason when back to available
                newAvailability.reason = 'Lesión';
            }
            return { ...p, availability: newAvailability };
          }
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, playerId: number) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ''; // Reset input to allow re-uploading same file

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('La imagen es demasiado grande. Por favor, elige una de menos de 5MB.');
        return;
    }

    const photoId = `player-photo-${playerId}-${Date.now()}`;
    try {
        const processedFile = await processImageFile(file);
        
        const oldPlayer = localRoster.find(p => p.id === playerId);
        if (oldPlayer?.photoId) {
            await deleteMedia(oldPlayer.photoId);
        }

        await addMedia(photoId, processedFile);
        
        handlePlayerChange(playerId, 'photoId', photoId);
    } catch (error) {
        console.error("Failed to process or save photo:", error);
        alert(`Error al procesar la foto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };


  const handleAddPlayer = () => {
    const newPlayer: RosterPlayer = {
      id: Date.now(),
      name: '',
      number: 0,
      dateOfBirth: '',
      availability: { status: 'Disponible', reason: 'Lesión' }
    };
    setLocalRoster(prev => [...prev, newPlayer]);
  };

  const handleRemovePlayer = async (id: number) => {
    const playerToRemove = localRoster.find(p => p.id === id);
    if (playerToRemove?.photoId) {
        try {
            await deleteMedia(playerToRemove.photoId);
        } catch (error) {
            console.error("Failed to delete photo from DB", error);
        }
    }
    setLocalRoster(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveChanges = () => {
    const cleanedRoster = localRoster.filter(p => p.name.trim() !== '' && p.number > 0);
    onRosterChange(cleanedRoster);
    onBack();
  };
  
  const handleFileImportClick = () => {
    importFileRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportRoster(file);
    }
    event.target.value = '';
  };
  
  const numberCounts = useMemo(() => {
    return localRoster.reduce((acc, player) => {
      if (player.number > 0) {
        acc[player.number] = (acc[player.number] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);
  }, [localRoster]);
  
  const PlayerRow: React.FC<{player: RosterPlayer}> = ({ player }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const age = calculateAge(player.dateOfBirth);
    const isNumberDuplicated = player.number > 0 && numberCounts[player.number] > 1;
    const availability = player.availability || { status: 'Disponible', reason: 'Lesión' };
    
    return (
        <div className={`bg-gray-700 p-2 rounded-md transition-opacity ${availability.status === 'No Disponible' ? 'opacity-60' : ''}`}>
            <div className="flex flex-col lg:grid lg:grid-cols-[60px_80px_1fr_180px_80px_220px_auto] gap-x-4 gap-y-2 lg:items-center">
                {/* Combined first row for mobile/tablet */}
                <div className="w-full flex items-center gap-4 lg:contents">
                    <div className="flex-shrink-0 lg:flex lg:items-center lg:justify-center">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={(e) => handleImageUpload(e, player.id)}
                            className="hidden"
                            aria-hidden="true"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 hover:bg-gray-500 transition-colors overflow-hidden border-2 border-gray-500"
                            title="Cambiar foto"
                            aria-label={`Cambiar foto de ${player.name}`}
                        >
                           <PlayerPhoto photoId={player.photoId} alt={player.name} />
                        </button>
                    </div>

                    <input type="number" placeholder="#" value={player.number || ''} onChange={(e) => handlePlayerChange(player.id, 'number', parseInt(e.target.value) || 0)} className={`bg-gray-600 w-20 lg:w-full text-center rounded p-2 font-semibold ${isNumberDuplicated ? 'input-error' : ''}`} title={isNumberDuplicated ? 'Este dorsal ya está en uso' : 'Dorsal'}/>
                    
                    <input type="text" placeholder="Nombre" value={player.name} onChange={(e) => handlePlayerChange(player.id, 'name', e.target.value)} className="bg-gray-600 flex-grow rounded p-2"/>

                    {/* These are part of the grid on desktop, but need to be flex items for mobile */}
                    <input type="date" value={player.dateOfBirth || ''} onChange={(e) => handlePlayerChange(player.id, 'dateOfBirth', e.target.value)} className="bg-gray-600 w-full rounded p-2 hidden lg:block"/>
                    <div className="bg-gray-800 h-10 items-center justify-center rounded p-2 text-center font-semibold hidden lg:flex">
                        {age !== null ? age : '-'}
                    </div>
                    <div className="hidden lg:flex gap-2 items-center">
                        <select value={availability.status} onChange={e => handlePlayerChange(player.id, 'availability.status', e.target.value)} className={`bg-gray-600 rounded p-2 w-full font-semibold ${availability.status === 'No Disponible' ? 'text-red-400' : 'text-green-400'}`}>
                            <option value="Disponible">Disponible</option>
                            <option value="No Disponible">No Disponible</option>
                        </select>
                        {availability.status === 'No Disponible' && (
                            <select value={availability.reason} onChange={e => handlePlayerChange(player.id, 'availability.reason', e.target.value)} className="bg-gray-600 rounded p-2 w-full text-sm">
                                <option>Lesión</option><option>Estudios</option><option>Viaje</option><option>Otro</option>
                            </select>
                        )}
                    </div>
                     <div className="flex items-center justify-self-end">
                        <button onClick={() => setExpandedPlayer(p => p === player.id ? null : player.id)} className="text-gray-300 hover:text-white p-2">
                            <ChevronDownIcon className={`transition-transform duration-200 ${expandedPlayer === player.id ? 'rotate-180' : ''}`} />
                        </button>
                        <button onClick={() => handleRemovePlayer(player.id)} className="text-red-400 hover:text-red-300 p-2" title="Eliminar Jugadora">
                            <TrashIcon />
                        </button>
                    </div>
                </div>
                
                {/* Second row for mobile/tablet */}
                <div className="w-full grid grid-cols-2 gap-4 mt-2 lg:hidden">
                    <div>
                        <label className="text-xs text-gray-400">F. Nacimiento</label>
                        <input type="date" value={player.dateOfBirth || ''} onChange={(e) => handlePlayerChange(player.id, 'dateOfBirth', e.target.value)} className="bg-gray-600 w-full rounded p-2"/>
                    </div>
                     <div>
                        <label className="text-xs text-gray-400">Edad</label>
                        <div className="bg-gray-800 h-10 flex items-center justify-center rounded p-2 text-center font-semibold">
                            {age !== null ? age : '-'}
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs text-gray-400">Disponibilidad</label>
                         <div className="flex gap-2 items-center">
                            <select value={availability.status} onChange={e => handlePlayerChange(player.id, 'availability.status', e.target.value)} className={`bg-gray-600 rounded p-2 w-full font-semibold ${availability.status === 'No Disponible' ? 'text-red-400' : 'text-green-400'}`}>
                                <option value="Disponible">Disponible</option>
                                <option value="No Disponible">No Disponible</option>
                            </select>
                            {availability.status === 'No Disponible' && (
                                <select value={availability.reason} onChange={e => handlePlayerChange(player.id, 'availability.reason', e.target.value)} className="bg-gray-600 rounded p-2 w-full text-sm">
                                    <option>Lesión</option><option>Estudios</option><option>Viaje</option><option>Otro</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {expandedPlayer === player.id && <PlayerStats stats={playerStats.get(player.id)!} />}
        </div>
    )
  }

  return (
    <div className="bg-gray-800 p-4 sm:p-6 rounded-lg max-w-6xl mx-auto animate-fade-in space-y-6">
       <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".xlsx" className="hidden"/>
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--secondary-color)]">Gestionar Plantilla</h2>
        <div className="flex gap-2 flex-wrap">
            <button onClick={handleFileImportClick} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm inline-flex items-center gap-2" title="Importar desde Excel (.xlsx). Columnas: Nombre, Dorsal, Fecha de Nacimiento">
                <ArrowUpTrayIcon className="w-5 h-5"/> Importar
            </button>
            <button onClick={onBack} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                &larr; Volver
            </button>
        </div>
      </div>
      
      <div className="bg-gray-900/50 p-4 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-center">Personalización del Equipo</h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-3">
                <label htmlFor="primaryColor" className="font-semibold text-lg">Color Principal:</label>
                <div className="relative w-12 h-12 border-2 border-gray-600 rounded-full overflow-hidden">
                    <input
                        type="color"
                        id="primaryColor"
                        value={teamSettings.primaryColor}
                        onChange={(e) => onTeamSettingsChange({ ...teamSettings, primaryColor: e.target.value })}
                        className="absolute -top-1 -left-1 w-16 h-16 cursor-pointer"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <label htmlFor="secondaryColor" className="font-semibold text-lg">Color Secundario:</label>
                 <div className="relative w-12 h-12 border-2 border-gray-600 rounded-full overflow-hidden">
                    <input
                        type="color"
                        id="secondaryColor"
                        value={teamSettings.secondaryColor}
                        onChange={(e) => onTeamSettingsChange({ ...teamSettings, secondaryColor: e.target.value })}
                        className="absolute -top-1 -left-1 w-16 h-16 cursor-pointer"
                    />
                </div>
            </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-sm font-semibold text-gray-400">Filtro de Estadísticas:</span>
        <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg">
            {(['Todos', ...MATCH_TYPES] as const).map(f => (
                <button key={f} onClick={() => setStatsFilter(f)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${statsFilter === f ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-gray-700'}`}>
                    {f}
                </button>
            ))}
        </div>
      </div>


      <div className="hidden lg:grid grid-cols-[60px_80px_1fr_180px_80px_220px_auto] gap-x-4 items-center px-2 pb-2 text-sm font-semibold text-gray-400">
        <div className="text-center">Foto</div>
        <div className="text-center">Dorsal</div>
        <div>Nombre</div>
        <div className="text-center">F. Nacimiento</div>
        <div className="text-center">Edad</div>
        <div className="text-center">Disponibilidad</div>
        <div></div>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {localRoster.map((player) => <PlayerRow key={player.id} player={player} />)}
      </div>

      <div className="mt-4 border-t border-gray-700 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
         <button onClick={handleAddPlayer} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">
          <PlusCircleIcon /> Añadir Jugadora
        </button>
        <button onClick={handleSaveChanges} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-lg transition-transform hover:scale-105">
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default TeamRoster;