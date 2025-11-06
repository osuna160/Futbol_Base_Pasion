import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { Match, MatchDetails, TeamSetup, UnavailableSetup, StarterSetup, SubSetup, MatchType, UnavailabilityReason, RosterPlayer, OpponentTeam, OpponentPlayer } from '../types';
import { FORMATIONS, MY_TEAM_NAME, getFormationData } from '../constants';
import { UNAVAILABILITY_REASONS, MATCH_TYPES } from '../types';
import { TrashIcon, ChevronDownIcon, MinusCircleIcon, PlusCircleIcon, FootballFieldSVG, CalendarIcon } from './icons';
import PlayerToken from './PlayerToken';
import { MatchState } from '../types';
import TeamSetupPanel from './TeamSetupPanel';

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
            
            const year = finalDate.getFullYear();
            const month = (finalDate.getMonth() + 1).toString().padStart(2, '0');
            const day = finalDate.getDate().toString().padStart(2, '0');
            const formattedHours = finalDate.getHours().toString().padStart(2, '0');
            const formattedMinutes = finalDate.getMinutes().toString().padStart(2, '0');
            
            const localDateTimeString = `${year}-${month}-${day}T${formattedHours}:${formattedMinutes}`;

            onChange(localDateTimeString);
        } else {
            onChange('');
        }
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setSelectedDate(null);
        setCurrentDate(new Date()); // Reset calendar to current month
        setIsOpen(false);
    }

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
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
            <button onClick={() => setIsOpen(prev => !prev)} className="input-field flex items-center gap-2 text-left">
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
                    <div className="datepicker-grid">{renderCalendar()}</div>

                    <div className="mt-4 pt-4 border-t border-gray-600 flex items-center justify-center gap-4">
                        <label className="font-semibold">Hora:</label>
                        <input type="time" value={time} onChange={handleTimeChange} className="bg-gray-600 p-2 rounded"/>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={handleClear} className="text-gray-400 text-sm font-semibold px-3 py-1 hover:bg-gray-600 rounded">Limpiar</button>
                        <button onClick={handleConfirm} className="bg-[var(--primary-color)] text-white text-sm font-semibold px-4 py-2 rounded">Confirmar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface SetupProps {
  match: Match;
  roster: RosterPlayer[];
  opponentTeams: OpponentTeam[];
  onMatchChange: (updatedMatch: Match) => void;
  onStartMatch: () => void;
  onBackToDashboard: () => void;
  onDeleteMatch: (matchId: number, cb: () => void) => void;
}

const Setup: React.FC<SetupProps> = ({ match, roster, opponentTeams, onMatchChange, onStartMatch, onBackToDashboard, onDeleteMatch }) => {
    
    const updateDetails = (field: keyof MatchDetails, value: any) => {
        const newDetails = { ...match.details, [field]: value };
        if (field === 'matchType' && value !== 'Liga') {
            delete newDetails.jornada;
        }
        onMatchChange({ ...match, details: newDetails });
    };

    const updateMyTeamSetup = (newSetup: TeamSetup) => {
        onMatchChange({ ...match, myTeamSetup: newSetup });
    };
    
    const updateOpponentTeamSetup = (newSetup: TeamSetup) => {
        onMatchChange({ ...match, opponentTeamSetup: newSetup });
    };

    const handleOpponentSelect = (id: string) => {
        const teamId = parseInt(id, 10);
        if (isNaN(teamId)) {
            // Manual mode selected
            onMatchChange({
                ...match,
                opponentTeamId: undefined,
                details: { ...match.details, opponentName: "Equipo Rival", opponentLogo: undefined },
                opponentTeamSetup: {
                    formation: '4-3-3',
                    starters: getFormationData('4-3-3').map(posInfo => ({ 
                        position: posInfo.pos,
                        positionName: posInfo.name,
                        positionAbbr: posInfo.abbr,
                        playerName: '', 
                        playerNumber: 0, 
                        playerId: null 
                    })),
                    subs: Array.from({ length: 7 }, (_, i) => ({ id: Date.now() + i, playerName: '', playerNumber: 0 })),
                    unavailable: []
                }
            });
        } else {
            const selectedTeam = opponentTeams.find(t => t.id === teamId);
            if (selectedTeam) {
                onMatchChange({
                    ...match,
                    opponentTeamId: teamId,
                    details: { ...match.details, opponentName: selectedTeam.name, opponentLogo: selectedTeam.crest },
                    opponentTeamSetup: {
                        ...match.opponentTeamSetup, // Keep current formation
                        starters: getFormationData(match.opponentTeamSetup.formation).map(posInfo => ({ 
                            position: posInfo.pos,
                            positionName: posInfo.name,
                            positionAbbr: posInfo.abbr,
                            playerName: '', 
                            playerNumber: 0, 
                            playerId: null 
                        })),
                        subs: selectedTeam.players.map(p => ({ id: p.id, playerName: p.name, playerNumber: p.number })),
                        unavailable: []
                    }
                });
            }
        }
    };
    
    const opponentRoster = useMemo(() => {
        if (!match.opponentTeamId) return null;
        const selectedTeam = opponentTeams.find(t => t.id === match.opponentTeamId);
        return selectedTeam?.players || null;
    }, [match.opponentTeamId, opponentTeams]);

    const isSetupComplete = useMemo(() => {
        const myTeamReady = match.myTeamSetup.starters.every(s => s.playerId);
        const opponentReady = match.opponentTeamSetup.starters.every(s => s.playerName && s.playerNumber > 0);
        return myTeamReady && opponentReady;
    }, [match]);
    
    const handleDeleteAndGoBack = () => {
        onDeleteMatch(match.id, onBackToDashboard);
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Configuración del Partido</h1>
                 <div className="flex gap-2 flex-wrap justify-center">
                    <button onClick={onBackToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        &larr; Volver
                    </button>
                    {match.matchState === MatchState.NOT_STARTED && (
                        <button onClick={handleDeleteAndGoBack} className="bg-red-800 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Descartar Partido
                        </button>
                    )}
                    <button 
                        onClick={onStartMatch} 
                        disabled={!isSetupComplete && match.matchState === MatchState.NOT_STARTED}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-lg transition-transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                        title={!isSetupComplete ? "Completa las alineaciones para empezar" : "Empezar Partido"}
                    >
                        {match.matchState === MatchState.NOT_STARTED ? 'Empezar Partido' : 'Reanudar'} &rarr;
                    </button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                <div className="bg-gray-800 p-4 rounded-lg space-y-4 md:col-span-2 xl:col-span-1">
                    <h2 className="text-xl font-bold text-center text-white border-b border-gray-700 pb-3 mb-4">1. Detalles del Partido</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-4">
                            <div><label className="input-label">Tipo de Partido</label><select value={match.details.matchType} onChange={e => updateDetails('matchType', e.target.value)} className="input-field"><option disabled>-- Seleccionar --</option>{MATCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            {match.details.matchType === 'Liga' && <div><label className="input-label">Jornada</label><input type="number" placeholder="Ej: 14" value={match.details.jornada || ''} onChange={e => updateDetails('jornada', parseInt(e.target.value))} className="input-field" min="1"/></div>}
                            <div><label className="input-label">Local / Visitante</label><div className="flex gap-2"><button onClick={() => updateDetails('myTeamLocation', 'home')} className={`flex-1 py-2 rounded ${match.details.myTeamLocation === 'home' ? 'bg-[var(--primary-color)] font-bold' : 'bg-gray-700'}`}>Local</button><button onClick={() => updateDetails('myTeamLocation', 'away')} className={`flex-1 py-2 rounded ${match.details.myTeamLocation === 'away' ? 'bg-pink-600 font-bold' : 'bg-gray-700'}`}>Visitante</button></div></div>
                        </div>
                        <div className="space-y-4">
                            <div><label className="input-label">Fecha y Hora</label><DateTimePicker value={match.details.matchTime} onChange={val => updateDetails('matchTime', val)} /></div>
                            <div><label className="input-label">Estadio / Campo</label><input type="text" value={match.details.stadiumName} onChange={e => updateDetails('stadiumName', e.target.value)} className="input-field" /></div>
                            <div><label className="input-label">Árbitro/a</label><input type="text" value={match.details.refereeName} onChange={e => updateDetails('refereeName', e.target.value)} className="input-field" /></div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg xl:col-span-1">
                    <h2 className="text-xl font-bold text-center text-[var(--secondary-color)] border-b border-gray-700 pb-3 mb-4">2. Mi Equipo</h2>
                    <p className="w-full bg-gray-900 text-xl font-bold text-center p-2 rounded-md mb-4">{MY_TEAM_NAME}</p>
                    <TeamSetupPanel teamSetup={match.myTeamSetup} onTeamSetupChange={updateMyTeamSetup} isMyTeam={true} roster={roster}/>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg xl:col-span-1">
                    <h2 className="text-xl font-bold text-center text-pink-400 border-b border-gray-700 pb-3 mb-4">3. Equipo Rival</h2>
                    <div className="mb-4">
                        <label className="input-label">Seleccionar Equipo Rival</label>
                        <select
                            value={match.opponentTeamId || 'manual'}
                            onChange={e => handleOpponentSelect(e.target.value)}
                            className="input-field"
                        >
                            <option value="manual">-- Equipo Manual --</option>
                            {opponentTeams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {!match.opponentTeamId && (
                        <input type="text" value={match.details.opponentName} onChange={e => updateDetails('opponentName', e.target.value)} placeholder="Nombre Equipo Rival" className="w-full bg-gray-900 text-xl font-bold text-center p-2 rounded-md outline-none focus:ring-2 ring-pink-500 mb-4" />
                    )}

                    <TeamSetupPanel 
                        teamSetup={match.opponentTeamSetup} 
                        onTeamSetupChange={updateOpponentTeamSetup} 
                        isMyTeam={false} 
                        roster={opponentRoster || undefined} // Pass roster if a team is selected
                    />
                </div>
            </div>
        </div>
    );
};

export default Setup;