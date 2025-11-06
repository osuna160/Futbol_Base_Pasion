import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Match, MatchDetails, TeamSetup, UnavailableSetup, StarterSetup, SubSetup, MatchType, UnavailabilityReason, RosterPlayer, OpponentPlayer } from '../types';
import { FORMATIONS, MY_TEAM_NAME, getFormationData } from '../constants';
import { UNAVAILABILITY_REASONS, MATCH_TYPES } from '../types';
import { TrashIcon, ChevronDownIcon, MinusCircleIcon, PlusCircleIcon, FootballFieldSVG } from './icons';
import PlayerToken from './PlayerToken';

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
          const playerLike = {
            id: starter.playerId || index, name: starter.playerName || `Jugadora ${index + 1}`,
            number: starter.playerNumber || 0, positionName: starter.positionName,
            positionAbbr: starter.positionAbbr, position: starter.position,
            isGoalkeeper: index === 0, yellowCards: [], redCard: null,
            isSentOff: false, isOnField: true, goals: [], goalChances: [],
            penaltiesCommitted: [], penaltiesMissed: [], offsidesCommitted: [],
            goalsConceded: [], saves: [], penaltiesSaved: [],
          };
          return (<PlayerToken key={index} player={playerLike} teamId={isMyTeam ? 'a' : 'b'} onMove={(pos) => onPlayerMove(index, pos)}/>);
        })}
      </div>
    </div>
  );
};

const FormationSelect: React.FC<{label: string, formation: string, onFormationChange: (formation: string) => void}> = ({label, formation, onFormationChange}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (formationKey: string) => {
        onFormationChange(formationKey);
        setIsOpen(false);
    }

    return (
        <div ref={dropdownRef} className="relative w-full">
            <label className="block text-center font-semibold text-lg mb-1">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gray-700 text-white font-semibold py-2 px-3 rounded-md flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{formation}</span>
                <ChevronDownIcon className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul
                    className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto"
                    role="listbox"
                >
                    {Object.keys(FORMATIONS).map(formationKey => (
                        <li key={formationKey}>
                            <button
                                onClick={() => handleSelect(formationKey)}
                                className={`w-full text-left px-3 py-2 text-sm font-semibold transition-colors ${formation === formationKey ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-gray-600'}`}
                                role="option"
                                aria-selected={formation === formationKey}
                            >
                                {formationKey}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


interface TeamSetupPanelProps {
    teamSetup: TeamSetup;
    onTeamSetupChange: (newSetup: TeamSetup) => void;
    isMyTeam: boolean;
    roster?: RosterPlayer[] | OpponentPlayer[];
}

const TeamSetupPanel: React.FC<TeamSetupPanelProps> = ({ teamSetup, onTeamSetupChange, isMyTeam, roster = [] }) => {
    
    const [isAddingUnavailable, setIsAddingUnavailable] = useState(false);
    const [selectedUnavailablePlayerId, setSelectedUnavailablePlayerId] = useState<number | ''>('');
    const [selectedUnavailableReason, setSelectedUnavailableReason] = useState<UnavailabilityReason>('Lesión');

    const assignedStarterPlayerIds = useMemo(() => new Set(teamSetup.starters.map(s => s.playerId).filter(Boolean)), [teamSetup.starters]);
    const unavailablePlayerIds = useMemo(() => new Set(teamSetup.unavailable.map(u => u.id)), [teamSetup.unavailable]);
    const assignedStartersCount = useMemo(() => teamSetup.starters.filter(s => isMyTeam || 'playerId' in s ? s.playerId : s.playerName).length, [teamSetup.starters, isMyTeam]);
    
    const opponentNumberCounts = useMemo(() => {
        if (isMyTeam) return {};
        const activeNumbers = [...teamSetup.starters.map(p => p.playerNumber), ...teamSetup.subs.map(p => p.playerNumber)].filter(n => n > 0);
        return activeNumbers.reduce((acc, num) => {
            acc[num] = (acc[num] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);
    }, [isMyTeam, teamSetup.starters, teamSetup.subs]);

    const isOpponentNumberInvalid = (num: number) => num > 0 && (num > 99 || (opponentNumberCounts[num] > 1));
    
    const updateSetup = (updateFn: (prev: TeamSetup) => TeamSetup) => onTeamSetupChange(updateFn(teamSetup));

    const handleFormationChange = (newFormation: string) => {
        const formationData = getFormationData(newFormation);
        updateSetup(prev => {
             const newStarters = formationData.map((posInfo, index) => {
                const existingStarter = prev.starters[index];
                return {
                    positionName: posInfo.name, positionAbbr: posInfo.abbr,
                    playerName: existingStarter?.playerName || '', playerNumber: existingStarter?.playerNumber || 0,
                    playerId: existingStarter?.playerId || null, position: posInfo.pos,
                };
            });
            return { ...prev, formation: newFormation, starters: newStarters }
        });
    };

    const handleStarterSelect = (index: number, selectedPlayerId: string) => {
        updateSetup(prev => {
            const playerId = parseInt(selectedPlayerId, 10);
            const selectedPlayer = roster.find(p => p.id === playerId);
            const newStarters = prev.starters.map((s, i) => {
                if (i === index) {
                    return selectedPlayer ? { ...s, playerName: selectedPlayer.name, playerNumber: selectedPlayer.number, playerId: selectedPlayer.id } : { ...s, playerName: '', playerNumber: 0, playerId: null };
                }
                return s;
            });
            return { ...prev, starters: newStarters };
        });
    };
    
    const handleOpponentStarterChange = (index: number, field: 'playerName' | 'playerNumber', value: string) => {
        updateSetup(prev => ({ ...prev, starters: prev.starters.map((s, i) => i === index ? {...s, [field]: field === 'playerNumber' ? parseInt(value) || 0 : value } : s) }));
    };

    const handlePlayerMove = (starterIndex: number, newPosition: { x: number; y: number }) => {
        updateSetup(prev => ({ ...prev, starters: prev.starters.map((starter, index) => index === starterIndex ? { ...starter, position: newPosition } : starter) }));
    };

    const availableRosterForUnavailable = useMemo(() => {
        if (!isMyTeam) return roster as OpponentPlayer[];
        return (roster as RosterPlayer[])
            .filter(p => p.availability?.status === 'Disponible' && !unavailablePlayerIds.has(p.id))
            .sort((a,b) => a.number - b.number);
    }, [isMyTeam, roster, unavailablePlayerIds]);
    
    const teamSubs = useMemo(() => {
        if (!isMyTeam && roster.length > 0) { // Opponent with pre-configured roster
            return (roster as OpponentPlayer[]).filter(p => !assignedStarterPlayerIds.has(p.id));
        }
        if (isMyTeam) {
             return availableRosterForUnavailable.filter(p => !assignedStarterPlayerIds.has(p.id));
        }
        return [];
    }, [isMyTeam, roster, availableRosterForUnavailable, assignedStarterPlayerIds]);


    const handleOpponentSubChange = (id: number, field: 'playerName' | 'playerNumber', value: string) => {
        updateSetup(prev => ({ ...prev, subs: prev.subs.map(s => s.id === id ? {...s, [field]: field === 'playerNumber' ? parseInt(value) || 0 : value} : s) }));
    };
    
    const handleAddOpponentSub = () => updateSetup(prev => ({ ...prev, subs: [...prev.subs, {id: Date.now(), playerName: '', playerNumber: 0}] }));
    const handleRemoveOpponentSub = (id: number) => updateSetup(prev => ({ ...prev, subs: prev.subs.filter(s => s.id !== id) }));
    
    const handleConfirmAddUnavailable = () => {
        if (!selectedUnavailablePlayerId) return;
        const playerToAdd = roster.find(s => s.id === selectedUnavailablePlayerId);
        if (!playerToAdd) return;

        const newUnavailable: UnavailableSetup = { id: playerToAdd.id, playerName: playerToAdd.name, playerNumber: playerToAdd.number, reason: selectedUnavailableReason };
        updateSetup(prev => ({ ...prev, unavailable: [...prev.unavailable, newUnavailable].sort((a, b) => a.playerNumber - b.playerNumber), starters: prev.starters.map(s => s.playerId === playerToAdd.id ? {...s, playerName: '', playerNumber: 0, playerId: null} : s) }));
        setIsAddingUnavailable(false);
        setSelectedUnavailablePlayerId('');
        setSelectedUnavailableReason('Lesión');
    };

    const handleMakeAvailable = (id: number) => updateSetup(prev => ({ ...prev, unavailable: prev.unavailable.filter(u => u.id !== id) }));
    const handleAddOpponentUnavailable = () => updateSetup(prev => ({ ...prev, unavailable: [...prev.unavailable, {id: Date.now(), playerName: '', playerNumber: 0, reason: 'Lesión'}] }));
    const handleRemoveOpponentUnavailable = (id: number) => updateSetup(prev => ({ ...prev, unavailable: prev.unavailable.filter(u => u.id !== id) }));

    const renderManualOpponentSubs = () => (
         <div className="bg-gray-900/50 p-2 rounded-md space-y-2 max-h-60 overflow-y-auto">
            {teamSetup.subs.map(sub => (<div key={sub.id} className="flex items-center gap-2">
                <input type="number" placeholder="#" value={sub.playerNumber || ''} onChange={e => handleOpponentSubChange(sub.id, 'playerNumber', e.target.value)} className={`bg-gray-700 w-16 text-center rounded p-1 ${isOpponentNumberInvalid(sub.playerNumber) ? 'input-error' : ''}`} min="1" max="99" />
                <input type="text" placeholder="Nombre de la jugadora" value={sub.playerName} onChange={e => handleOpponentSubChange(sub.id, 'playerName', e.target.value)} className="bg-gray-700 flex-grow rounded p-1" />
                <button onClick={() => handleRemoveOpponentSub(sub.id)} className="text-red-400 hover:text-red-300 p-1"><MinusCircleIcon /></button>
            </div>))}
            <button onClick={handleAddOpponentSub} className="w-full text-sm py-1 px-2 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center gap-1"><PlusCircleIcon /> Añadir suplente</button>
        </div>
    );

    const renderRosterSubs = (subs: (RosterPlayer | OpponentPlayer)[]) => (
        <div className="bg-gray-900/50 p-2 rounded-md max-h-60 overflow-y-auto space-y-1">
            {subs.map(sub => (<div key={sub.id} className="p-1 rounded flex items-center gap-2">
                <span className="font-mono text-sm text-gray-400 w-6 text-center">{sub.number}</span>
                <span>{sub.name}</span>
            </div>))}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] lg:grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="w-full max-w-sm mx-auto md:mx-0">
                    <SetupFormationField
                        starters={teamSetup.starters}
                        isMyTeam={isMyTeam}
                        onPlayerMove={handlePlayerMove}
                    />
                </div>
                <div className="w-full md:w-44 mx-auto">
                    <FormationSelect
                        label="Sistema"
                        formation={teamSetup.formation}
                        onFormationChange={handleFormationChange}
                    />
                </div>
            </div>
            <div>
                <h4 className="font-semibold text-green-400 mb-2">Alineación Titular ({assignedStartersCount} / {teamSetup.starters.length})</h4>
                <div className="bg-gray-900/50 p-2 rounded-md space-y-2 max-h-96 overflow-y-auto">
                    {teamSetup.starters.map((starter, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 w-32 truncate" title={starter.positionName}>{starter.positionName}</span>
                            {(isMyTeam || roster.length > 0) ? (
                                <select value={starter.playerId || ''} onChange={(e) => handleStarterSelect(index, e.target.value)} className="bg-gray-700 w-full rounded p-1">
                                    <option value="">-- Vacante --</option>
                                    {availableRosterForUnavailable.map(p => (<option key={p.id} value={p.id} disabled={assignedStarterPlayerIds.has(p.id) && starter.playerId !== p.id}>(#{p.number}) {p.name}</option>))}
                                </select>
                            ) : (
                                <>
                                    <input type="number" placeholder="#" value={starter.playerNumber || ''} onChange={e => handleOpponentStarterChange(index, 'playerNumber', e.target.value)} className={`bg-gray-700 w-16 text-center rounded p-1 ${isOpponentNumberInvalid(starter.playerNumber) ? 'input-error' : ''}`} min="1" max="99"/>
                                    <input type="text" placeholder="Nombre de la jugadora" value={starter.playerName} onChange={e => handleOpponentStarterChange(index, 'playerName', e.target.value)} className="bg-gray-700 flex-grow rounded p-1"/>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <h4 className="font-semibold text-yellow-400 mb-2">Suplentes ({isMyTeam || roster.length > 0 ? teamSubs.length : teamSetup.subs.length})</h4>
                {isMyTeam || roster.length > 0 ? renderRosterSubs(teamSubs) : renderManualOpponentSubs()}
            </div>
            <div>
                <h4 className="font-semibold text-red-400 mb-2">No Disponibles ({teamSetup.unavailable.length})</h4>
                <div className="bg-gray-900/50 p-2 rounded-md space-y-2 max-h-60 overflow-y-auto">
                    {teamSetup.unavailable.map(u => (<div key={u.id} className="flex items-center justify-between p-1 rounded">
                        <span className="truncate">({u.playerNumber}) {u.playerName} - <span className="text-gray-400">{u.reason}</span></span>
                        <button onClick={() => isMyTeam || roster.length > 0 ? handleMakeAvailable(u.id) : handleRemoveOpponentUnavailable(u.id)} className="text-gray-400 hover:text-white" title="Marcar como disponible"><TrashIcon /></button>
                    </div>))}
                    {isMyTeam ? (<>
                        {isAddingUnavailable ? (<div className="flex gap-2 items-center p-1">
                            <select value={selectedUnavailablePlayerId} onChange={(e) => setSelectedUnavailablePlayerId(parseInt(e.target.value))} className="bg-gray-700 w-full rounded p-1"><option value="">-- Seleccionar --</option>{availableRosterForUnavailable.map(p => (<option key={p.id} value={p.id}>(#{(p as RosterPlayer).number}) {p.name}</option>))}
                            </select>
                            <select value={selectedUnavailableReason} onChange={e => setSelectedUnavailableReason(e.target.value as UnavailabilityReason)} className="bg-gray-700 rounded p-1"><option disabled>-- Motivo --</option>{UNAVAILABILITY_REASONS.map(r => (<option key={r} value={r}>{r}</option>))}
                            </select>
                            <button onClick={handleConfirmAddUnavailable} className="bg-green-600 px-2 py-1 rounded text-sm font-semibold">OK</button>
                            <button onClick={() => setIsAddingUnavailable(false)} className="bg-gray-600 px-2 py-1 rounded text-sm">X</button>
                        </div>) : (<button onClick={() => setIsAddingUnavailable(true)} className="w-full text-sm py-1 px-2 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center gap-1"><PlusCircleIcon /> Añadir no disponible</button>)}
                    </>) : (<button onClick={handleAddOpponentUnavailable} className="w-full text-sm py-1 px-2 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center gap-1"><PlusCircleIcon /> Añadir no disponible</button>)}
                </div>
            </div>
        </div>
    );
};

export default TeamSetupPanel;
