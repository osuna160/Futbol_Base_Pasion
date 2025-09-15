import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { Match, MatchDetails, TeamSetup, UnavailableSetup, StarterSetup, SubSetup, MatchType, UnavailabilityReason } from '../types';
import { FORMATIONS, MY_TEAM_NAME, getFormationData } from '../constants';
import { UNAVAILABILITY_REASONS, MATCH_TYPES } from '../types';
import { TrashIcon, ChevronDownIcon, MinusCircleIcon, PlusCircleIcon, FootballFieldSVG, CalendarIcon } from './icons';
import PlayerToken from './PlayerToken';
import { MatchState } from '../types';

const DateTimePicker: React.FC<{ value: string; onChange: (value: string) => void; }> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const getInitialDate = () => (value && !isNaN(new Date(value).getTime())) ? new Date(value) : new Date();

    const [currentDate, setCurrentDate] = useState(getInitialDate);
    const [selectedDate, setSelectedDate] = useState(() => (value && !isNaN(new Date(value).getTime())) ? new Date(value) : null);
    const [time, setTime] = useState(() => {
        if (value && !isNaN(new Date(value).getTime())) {
            const d = new Date(value);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
        return '12:00';
    });
    
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    useEffect(() => {
        const d = (value && !isNaN(new Date(value).getTime())) ? new Date(value) : null;
        if(d) {
            setCurrentDate(d);
            setSelectedDate(d);
            setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
        }
    }, [value]);


    const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid issues with different month lengths
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };
    
    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTime(e.target.value);
    };

    const handleConfirm = () => {
        if (selectedDate) {
            const [hours, minutes] = time.split(':').map(Number);
            const finalDate = new Date(selectedDate);
            finalDate.setHours(hours, minutes, 0, 0);
            // Format to YYYY-MM-DDTHH:mm
            onChange(finalDate.toISOString().slice(0, 16));
        } else {
            onChange('');
        }
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setSelectedDate(null);
        setIsOpen(false);
    }

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        
        // Adjust to start week on Monday
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
        
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDayIndex);
        
        const daysToRender: Date[] = [];
        for (let i = 0; i < 42; i++) {
            daysToRender.push(new Date(startDate));
            startDate.setDate(startDate.getDate() + 1);
        }
        
        const today = new Date();
        today.setHours(0,0,0,0);

        return daysToRender.map((day, index) => {
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
            const isToday = day.toDateString() === today.toDateString();
            const isCurrentMonth = day.getMonth() === month;

            return (
                <div 
                    key={index} 
                    className={`datepicker-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => handleDayClick(day)}
                >
                    {day.getDate()}
                </div>
            );
        });
    };
    
    const formattedDisplayValue = (value && !isNaN(new Date(value).getTime())) 
        ? new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) 
        : 'Seleccionar fecha y hora';

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-2 bg-gray-700 p-2 rounded w-full outline-none focus:ring-2 focus:ring-cyan-500 text-left"
            >
                <CalendarIcon className="text-gray-400" />
                <span className={value ? 'text-white' : 'text-gray-400'}>{formattedDisplayValue}</span>
            </button>
            {isOpen && (
                <div className="datepicker-popover mt-2">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-600">&lt;</button>
                        <h3 className="text-lg font-bold capitalize">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h3>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-600">&gt;</button>
                    </div>

                    <div className="datepicker-grid text-center font-semibold text-gray-400 mb-2">
                        {daysOfWeek.map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="datepicker-grid">
                        {renderCalendar()}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-600 flex items-center justify-center gap-4">
                        <label className="font-semibold">Hora:</label>
                        <input
                            type="time"
                            value={time}
                            onChange={handleTimeChange}
                            className="bg-gray-600 p-2 rounded"
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={handleClear} className="text-gray-400 text-sm font-semibold px-3 py-1 hover:bg-gray-600 rounded">Limpiar</button>
                        <button onClick={handleConfirm} className="bg-cyan-600 text-white text-sm font-semibold px-4 py-2 rounded">Confirmar</button>
                    </div>
                </div>
            )}
        </div>
    );
};


interface SetupFormationFieldProps {
  starters: StarterSetup[];
  isMyTeam: boolean;
  onPlayerMove: (starterIndex: number, position: { x: number; y: number }) => void;
}

const SetupFormationField: React.FC<SetupFormationFieldProps> = ({ starters, isMyTeam, onPlayerMove }) => {
  return (
    <div className="formation-container max-w-sm mx-auto">
      <FootballFieldSVG />
      <div className="absolute top-0 left-0 w-full h-full z-10">
        {starters.map((starter, index) => {
          // PlayerToken expects a 'Player' object. We'll create a compatible one.
          const playerLike = {
            id: starter.playerId || index,
            name: starter.playerName || `Jugadora ${index + 1}`,
            number: starter.playerNumber || 0,
            positionName: starter.positionName,
            positionAbbr: starter.positionAbbr,
            position: starter.position,
            isGoalkeeper: index === 0, // GK is always the first in the list
            // Dummy props to satisfy the Player type
            yellowCards: [],
            redCard: null,
            isSentOff: false,
            isOnField: true,
            goals: [],
            foulsCommitted: [],
            penaltiesCommitted: [],
            penaltiesMissed: [],
            offsidesCommitted: [],
            goalsConceded: [],
            saves: [],
            penaltiesSaved: [],
          };

          return (
            <PlayerToken
              key={index}
              player={playerLike}
              teamId={isMyTeam ? 'a' : 'b'}
              onMove={(pos) => onPlayerMove(index, pos)}
            />
          );
        })}
      </div>
    </div>
  );
};


interface TeamSetupPanelProps {
    teamName: string;
    onTeamNameChange?: (name: string) => void;
    teamSetup: TeamSetup;
    onTeamSetupChange: (newSetup: TeamSetup) => void;
    isMyTeam: boolean;
}

const TeamSetupPanel: React.FC<TeamSetupPanelProps> = ({ teamName, onTeamNameChange, teamSetup, onTeamSetupChange, isMyTeam }) => {
    
    const [isFormationListOpen, setIsFormationListOpen] = useState(false);
    const [isAddingUnavailable, setIsAddingUnavailable] = useState(false);
    const [selectedUnavailablePlayerId, setSelectedUnavailablePlayerId] = useState<number | ''>('');
    const [selectedUnavailableReason, setSelectedUnavailableReason] = useState<UnavailabilityReason>('Lesión');

    const activePlayerNumbers = useMemo(() => {
        return [
            ...teamSetup.starters.map(p => p.playerNumber), 
            ...teamSetup.subs.map(p => p.playerNumber)
        ].filter(n => n > 0);
    }, [teamSetup.starters, teamSetup.subs]);

    const numberCounts = useMemo(() => {
        return activePlayerNumbers.reduce((acc, num) => {
            acc[num] = (acc[num] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);
    }, [activePlayerNumbers]);

    const isNumberInvalid = (num: number) => num < 1 || num > 99 || (numberCounts[num] > 1);
    
    const updateSetup = (updateFn: (prev: TeamSetup) => TeamSetup) => {
        onTeamSetupChange(updateFn(teamSetup));
    };

    const handleFormationChange = (newFormation: string) => {
        const formationData = getFormationData(newFormation);
        updateSetup(prev => {
             const newStarters = formationData.map((posInfo, index) => {
                const existingStarter = prev.starters[index];
                return {
                    positionName: posInfo.name,
                    positionAbbr: posInfo.abbr,
                    playerName: existingStarter?.playerName || '',
                    playerNumber: existingStarter?.playerNumber || 0,
                    playerId: existingStarter?.playerId || null,
                    position: posInfo.pos,
                };
            });

            return {
                ...prev,
                formation: newFormation,
                starters: newStarters
            }
        });
        setIsFormationListOpen(false);
    };
    
    const handleStarterChange = (index: number, field: 'playerName' | 'playerNumber', value: string) => {
        updateSetup(prev => ({
            ...prev,
            starters: prev.starters.map((s, i) => i === index ? {...s, [field]: field === 'playerNumber' ? parseInt(value) || 0 : value, playerId: null} : s)
        }));
    };
    
    const assignedPlayerIds = useMemo(() => new Set(teamSetup.starters.map(s => s.playerId).filter(Boolean)), [teamSetup.starters]);
    const unavailablePlayerIds = useMemo(() => new Set(teamSetup.unavailable.map(u => u.id)), [teamSetup.unavailable]);

    const handleAssignPlayerToStarter = (starterIndex: number, subId: number) => {
        updateSetup(prev => {
            const newStarters = [...prev.starters];
            const currentStarter = newStarters[starterIndex];

            // If unassigning
            if (!subId) {
                newStarters[starterIndex] = { ...currentStarter, playerName: '', playerNumber: 0, playerId: null };
                return { ...prev, starters: newStarters };
            }

            const subToAssign = prev.subs.find(s => s.id === subId);
            if (!subToAssign) return prev;

            // Check if this sub is already assigned elsewhere and unassign it from the old position
            const alreadyAssignedIndex = newStarters.findIndex(s => s.playerId === subId);
            if(alreadyAssignedIndex > -1) {
                const oldPosition = newStarters[alreadyAssignedIndex];
                newStarters[alreadyAssignedIndex] = {...oldPosition, playerName: '', playerNumber: 0, playerId: null};
            }

            newStarters[starterIndex] = {
                ...currentStarter,
                playerName: subToAssign.playerName,
                playerNumber: subToAssign.playerNumber,
                playerId: subToAssign.id,
            };

            return { ...prev, starters: newStarters };
        });
    };

    const handlePlayerMove = (starterIndex: number, newPosition: { x: number; y: number }) => {
        updateSetup(prev => ({
            ...prev,
            starters: prev.starters.map((starter,
                index) =>
                index === starterIndex ? { ...starter, position: newPosition } : starter
            ),
        }));
    };

    const handleSubChange = (id: number, field: 'playerName' | 'playerNumber', value: string) => {
        updateSetup(prev => ({
            ...prev,
            subs: prev.subs.map(s => s.id === id ? {...s, [field]: field === 'playerNumber' ? parseInt(value) || 0 : value} : s)
        }));
    };
    
    const handleAddSub = () => updateSetup(prev => ({ ...prev, subs: [...prev.subs, {id: Date.now(), playerName: '', playerNumber: 0}] }));
    const handleRemoveSub = (id: number) => updateSetup(prev => ({ ...prev, subs: prev.subs.filter(s => s.id !== id) }));
    
    const handleAddUnavailable = () => updateSetup(prev => ({ ...prev, unavailable: [...prev.unavailable, {id: Date.now(), playerName: '', playerNumber: 0, reason: 'Lesión'}] }));
    const handleRemoveUnavailable = (id: number) => updateSetup(prev => ({ ...prev, unavailable: prev.unavailable.filter(u => u.id !== id) }));
    
    const handleConfirmAddUnavailable = () => {
        if (!selectedUnavailablePlayerId) return;
        const playerToAdd = teamSetup.subs.find(s => s.id === selectedUnavailablePlayerId);
        if (!playerToAdd) return;

        const newUnavailable: UnavailableSetup = {
            id: playerToAdd.id,
            playerName: playerToAdd.playerName,
            playerNumber: playerToAdd.playerNumber,
            reason: selectedUnavailableReason,
        };

        updateSetup(prev => ({
            ...prev,
            unavailable: [...prev.unavailable, newUnavailable].sort((a, b) => a.playerNumber - b.playerNumber)
        }));

        setIsAddingUnavailable(false);
        setSelectedUnavailablePlayerId('');
        setSelectedUnavailableReason('Lesión');
    };

    const availableForUnavailable = useMemo(() => {
        return teamSetup.subs.filter(sub => !assignedPlayerIds.has(sub.id) && !unavailablePlayerIds.has(sub.id));
    }, [teamSetup.subs, assignedPlayerIds, unavailablePlayerIds]);


    const titleColor = isMyTeam ? 'text-cyan-400' : 'text-pink-400';

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-6">
            {isMyTeam ? (
                <h3 className={`text-xl font-bold text-center ${titleColor}`}>{teamName}</h3>
            ) : (
                <input
                    type="text"
                    value={teamName}
                    onChange={e => onTeamNameChange?.(e.target.value)}
                    placeholder="Nombre Equipo Rival"
                    className={`w-full bg-gray-900 text-xl font-bold text-center p-1 rounded-md outline-none focus:ring-2 ring-pink-500 ${titleColor}`}
                />
            )}
            
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-xs">
                    <label className="block text-center font-semibold text-lg mb-1">Sistema</label>
                    <button
                        onClick={() => setIsFormationListOpen(prev => !prev)}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md flex justify-between items-center transition-colors"
                    >
                        <span>{teamSetup.formation}</span>
                        <ChevronDownIcon className={`transition-transform duration-200 ${isFormationListOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isFormationListOpen && (
                        <div 
                            className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10 p-2 flex flex-wrap justify-center gap-2"
                        >
                            {Object.keys(FORMATIONS).map(fKey => (
                                <button
                                    key={fKey}
                                    onClick={() => handleFormationChange(fKey)}
                                    className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                                        teamSetup.formation === fKey 
                                        ? 'bg-cyan-600 text-white' 
                                        : 'bg-gray-600 hover:bg-gray-500'
                                    }`}
                                >
                                    {fKey}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-2 w-full max-w-sm">
                    <SetupFormationField
                        starters={teamSetup.starters}
                        isMyTeam={isMyTeam}
                        onPlayerMove={handlePlayerMove}
                    />
                </div>
            </div>

            {/* Starters */}
            <div>
                <h4 className="font-semibold text-green-400 mb-2">Alineación Titular (11)</h4>
                <div className="bg-gray-900/50 p-2 rounded-md space-y-2 max-h-96 overflow-y-auto">
                    {teamSetup.starters.map((starter, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 w-32 truncate" title={starter.positionName}>{starter.positionName}</span>
                             {isMyTeam ? (
                                <select 
                                    value={starter.playerId || ''}
                                    onChange={(e) => handleAssignPlayerToStarter(index, Number(e.target.value))}
                                    className="bg-gray-700 flex-grow rounded p-1.5 text-white"
                                >
                                    <option value="">-- Vacante --</option>
                                    {starter.playerId && <option value={starter.playerId}>(#{starter.playerNumber}) {starter.playerName}</option>}
                                    {teamSetup.subs.filter(sub => !assignedPlayerIds.has(sub.id) && !unavailablePlayerIds.has(sub.id)).map(sub => (
                                        <option key={sub.id} value={sub.id}>
                                            (#{sub.playerNumber}) {sub.playerName}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <>
                                <input
                                    type="number"
                                    placeholder="#"
                                    value={starter.playerNumber || ''}
                                    onChange={e => handleStarterChange(index, 'playerNumber', e.target.value)}
                                    className={`bg-gray-700 w-16 text-center rounded p-1 ${isNumberInvalid(starter.playerNumber) ? 'input-error' : ''}`}
                                    min="1"
                                    max="99"
                                />
                                <input
                                    type="text"
                                    placeholder="Nombre de la jugadora"
                                    value={starter.playerName}
                                    onChange={e => handleStarterChange(index, 'playerName', e.target.value)}
                                    className="bg-gray-700 flex-grow rounded p-1"
                                />
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Substitutes */}
            <div>
                <h4 className="font-semibold text-yellow-400 mb-2">Suplentes ({teamSetup.subs.filter(s => s.playerName || s.playerNumber > 0).length})</h4>
                <div className="bg-gray-900/50 p-2 rounded-md space-y-2 max-h-48 overflow-y-auto">
                    {teamSetup.subs.map(sub => (
                        <div key={sub.id} className={`player-list-item ${assignedPlayerIds.has(sub.id) ? 'starter' : ''} ${unavailablePlayerIds.has(sub.id) ? 'unavailable' : ''}`}>
                             <input
                                type="number"
                                placeholder="#"
                                value={sub.playerNumber || ''}
                                onChange={e => handleSubChange(sub.id, 'playerNumber', e.target.value)}
                                className={`bg-gray-600 w-16 text-center rounded p-1 ${isNumberInvalid(sub.playerNumber) ? 'input-error' : ''}`}
                                disabled={isMyTeam}
                            />
                            <input
                                type="text"
                                placeholder="Nombre de la suplente"
                                value={sub.playerName}
                                onChange={e => handleSubChange(sub.id, 'playerName', e.target.value)}
                                className="bg-gray-600 flex-grow rounded p-1"
                                disabled={isMyTeam}
                            />
                            {!isMyTeam && <button onClick={() => handleRemoveSub(sub.id)} className="text-red-400 hover:text-red-300 p-1">
                                <TrashIcon />
                            </button>}
                        </div>
                    ))}
                </div>
                {!isMyTeam && <button onClick={handleAddSub} className="mt-2 w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-1.5 px-4 rounded text-sm">
                    + Añadir Suplente
                </button>}
            </div>

            {/* My Team Unavailable */}
            {isMyTeam && (
                <div>
                    <h4 className="font-semibold text-red-400 mb-2">No Disponibles ({teamSetup.unavailable.length})</h4>
                    <div className="bg-gray-900/50 p-2 rounded-md space-y-2 max-h-48 overflow-y-auto">
                        {teamSetup.unavailable.map(u => (
                            <div key={u.id} className="player-list-item unavailable">
                                <span className="bg-gray-600 w-16 text-center rounded p-1 font-semibold">
                                    #{u.playerNumber}
                                </span>
                                <div className="bg-gray-600 flex-grow rounded p-1 flex justify-between items-center">
                                    <span className="truncate">{u.playerName}</span>
                                    <span className="text-xs text-gray-400 pr-2">{u.reason}</span>
                                </div>
                                <button onClick={() => handleRemoveUnavailable(u.id)} className="text-red-400 hover:text-red-300 p-1">
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                        {isAddingUnavailable && (
                            <div className="p-2 bg-gray-700 rounded-md space-y-2">
                                <select
                                    value={selectedUnavailablePlayerId}
                                    onChange={e => setSelectedUnavailablePlayerId(Number(e.target.value) || '')}
                                    className="bg-gray-600 w-full p-2 rounded"
                                >
                                    <option value="">-- Selecciona jugadora --</option>
                                    {availableForUnavailable.map(p => (
                                        <option key={p.id} value={p.id}>(#{p.playerNumber}) {p.playerName}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedUnavailableReason}
                                    onChange={e => setSelectedUnavailableReason(e.target.value as UnavailabilityReason)}
                                    className="bg-gray-600 w-full p-2 rounded"
                                >
                                    {UNAVAILABILITY_REASONS.map(reason => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>
                                <div className="flex justify-end gap-2 pt-1">
                                    <button onClick={() => setIsAddingUnavailable(false)} className="text-gray-400 text-sm font-semibold px-3">Cancelar</button>
                                    <button onClick={handleConfirmAddUnavailable} disabled={!selectedUnavailablePlayerId} className="bg-green-600 text-sm font-semibold px-3 py-1 rounded disabled:bg-gray-500">Añadir</button>
                                </div>
                            </div>
                        )}
                    </div>
                    {!isAddingUnavailable && (
                        <button onClick={() => setIsAddingUnavailable(true)} className="mt-2 w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-1.5 px-4 rounded text-sm">
                            + Añadir No Disponible
                        </button>
                    )}
                </div>
            )}
            
            {/* Opponent Unavailable */}
            {!isMyTeam && <div>
                <h4 className="font-semibold text-red-400 mb-2">No Disponibles ({teamSetup.unavailable.length})</h4>
                <div className="bg-gray-900/50 p-2 rounded-md space-y-2 max-h-32 overflow-y-auto">
                     {teamSetup.unavailable.map(u => (
                        <div key={u.id} className="player-list-item">
                            <span className="bg-gray-600 w-16 text-center rounded p-1">
                                #{u.playerNumber}
                            </span>
                            <span className="bg-gray-600 flex-grow rounded p-1 truncate">
                                {u.playerName}
                            </span>
                             <button onClick={() => handleRemoveUnavailable(u.id)} className="text-red-400 hover:text-red-300 p-1">
                                <TrashIcon />
                            </button>
                        </div>
                    ))}
                </div>
                 <button onClick={handleAddUnavailable} className="mt-2 w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-1.5 px-4 rounded text-sm">
                    + Añadir No Disponible
                </button>
            </div>}
        </div>
    );
};

interface SetupProps {
  match: Match;
  onMatchChange: (match: Match) => void;
  onStartMatch: () => void;
  onBackToDashboard: () => void;
  onDeleteMatch: (matchId: number, callback?: () => void) => void;
}

const Setup: React.FC<SetupProps> = ({ 
    match, onMatchChange, onStartMatch, onBackToDashboard, onDeleteMatch
}) => {
    
    const { details: matchDetails, myTeamSetup, opponentTeamSetup } = match;

    useEffect(() => {
        if (matchDetails.myTeamLocation === 'home') {
            handleDetailChange('stadiumName', "MPAL. JOSE LUIS RUIZ CASADO");
        }
    }, [matchDetails.myTeamLocation]);
    
    const handleDetailChange = (field: keyof MatchDetails, value: string | MatchType) => {
        onMatchChange({
            ...match,
            details: { ...match.details, [field]: value }
        });
    };
    
    const handleMyTeamSetupChange = (newSetup: TeamSetup) => {
        onMatchChange({ ...match, myTeamSetup: newSetup });
    };

    const handleOpponentTeamSetupChange = (newSetup: TeamSetup) => {
        onMatchChange({ ...match, opponentTeamSetup: newSetup });
    };

    const handleDelete = () => {
        onDeleteMatch(match.id, onBackToDashboard);
    };

    const isNewMatch = match.matchState === MatchState.NOT_STARTED;
    const isFinished = match.matchState === MatchState.FULL_TIME;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gray-800 p-4 rounded-lg max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                     <button onClick={onBackToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                        &larr; Volver al Inicio
                    </button>
                    <h2 className="text-2xl font-bold text-center flex-grow">{isNewMatch ? 'Detalles del Encuentro' : 'Editar Partido'}</h2>
                    <div className="w-[148px]"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700 p-2 rounded flex items-center justify-between">
                        <span className="font-semibold">{MY_TEAM_NAME}</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="location" value="home" checked={matchDetails.myTeamLocation === 'home'} onChange={e => handleDetailChange('myTeamLocation', e.target.value)} className="form-radio text-cyan-400 bg-gray-900" />
                                Local
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="location" value="away" checked={matchDetails.myTeamLocation === 'away'} onChange={e => handleDetailChange('myTeamLocation', e.target.value)} className="form-radio text-pink-400 bg-gray-900" />
                                Visitante
                            </label>
                        </div>
                    </div>
                    <input type="text" placeholder="Nombre del Campo" value={matchDetails.stadiumName} onChange={e => handleDetailChange('stadiumName', e.target.value)} className="bg-gray-700 p-2 rounded disabled:bg-gray-600" disabled={matchDetails.myTeamLocation === 'home'} />
                    <div className="bg-gray-700 p-2 rounded flex items-center justify-between md:col-span-2">
                        <span className="font-semibold">Tipo de Partido:</span>
                        <div className="flex gap-4 flex-wrap justify-end">
                            {MATCH_TYPES.map(type => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="matchType"
                                        value={type}
                                        checked={matchDetails.matchType === type}
                                        onChange={e => handleDetailChange('matchType', e.target.value as MatchType)}
                                        className="form-radio text-cyan-400 bg-gray-900"
                                    />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-full max-w-md">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Fecha y hora de partido</label>
                        <DateTimePicker 
                            value={matchDetails.matchTime}
                            onChange={value => handleDetailChange('matchTime', value)}
                        />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Nombre del Árbitro/a" 
                        value={matchDetails.refereeName} 
                        onChange={e => handleDetailChange('refereeName', e.target.value)} 
                        className="bg-gray-700 p-2 rounded w-full max-w-md" 
                    />
                </div>
            </div>
            
            <div>
                <h2 className="text-2xl font-bold mb-4 text-center">Alineaciones y Tácticas</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <TeamSetupPanel
                        teamName={MY_TEAM_NAME}
                        teamSetup={myTeamSetup}
                        onTeamSetupChange={handleMyTeamSetupChange}
                        isMyTeam={true}
                    />
                    <TeamSetupPanel
                        teamName={matchDetails.opponentName}
                        onTeamNameChange={(name) => handleDetailChange('opponentName', name)}
                        teamSetup={opponentTeamSetup}
                        onTeamSetupChange={handleOpponentTeamSetupChange}
                        isMyTeam={false}
                    />
                </div>
            </div>

            <div className="text-center pt-4">
                <div className="flex justify-center items-center flex-wrap gap-4">
                    <button
                        onClick={isFinished ? onBackToDashboard : onStartMatch}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl"
                    >
                        {isFinished ? 'Volver al Inicio' : (isNewMatch ? 'Ir al Control del Partido' : 'Guardar y Volver')}
                    </button>
                    <button
                        onClick={handleDelete}
                        className="bg-red-800 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Eliminar Partido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Setup;