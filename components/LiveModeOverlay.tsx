import React, { useState, useMemo } from 'react';
import type { Team, TeamId, Player, PlayerStatKeys, MatchEvent } from '../types';
import { BallIcon, CardIcon, SubstituteIcon, CrosshairIcon, WindowIcon } from './icons';

interface LiveModeOverlayProps {
    teamA: Team;
    teamB: Team;
    events: MatchEvent[];
    onAddGoal: (teamId: TeamId, playerId: number) => void;
    onGiveCard: (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => void;
    onTeamStatChange: (teamId: TeamId, stat: 'cornersFor' | 'foulsCommitted', action: 'add' | 'remove') => void;
    onInitiateSub: (teamId: TeamId) => void;
    onUpdatePlayerStat: (teamId: TeamId, playerId: number, stat: PlayerStatKeys, action: 'add' | 'remove') => void;
}

type ActionType = 'goal' | 'yellow' | 'red' | 'offside' | 'goalChance';

interface PlayerPickerContext {
    teamId: TeamId;
    targetTeamId: TeamId; 
    action: ActionType;
}

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
        default:
            return null;
    }
};

const PlayerPickerModal: React.FC<{
    isOpen: boolean;
    team: Team;
    action: ActionType;
    onClose: () => void;
    onSelect: (playerId: number) => void;
}> = ({ isOpen, team, action, onClose, onSelect }) => {
    if (!isOpen) return null;

    const onFieldPlayers = team.starters.filter(p => !p.isSentOff);
    
    const getTitle = () => {
        switch(action) {
            case 'goal': return '¿Quién marcó el gol?';
            case 'yellow': return '¿Quién recibió la amarilla?';
            case 'red': return '¿Quién recibió la roja?';
            case 'offside': return '¿Quién estaba en fuera de juego?';
            case 'goalChance': return '¿Quién tuvo la ocasión?';
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl flex flex-col">
                <h2 className="text-xl font-bold mb-4">{getTitle()}</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {onFieldPlayers.map(player => (
                        <button
                            key={player.id}
                            onClick={() => onSelect(player.id)}
                            className="w-full text-left p-3 rounded transition-colors bg-gray-700 hover:bg-gray-600"
                        >
                            <span className="font-mono bg-gray-600 px-2 py-1 rounded mr-2">{player.number}</span>
                            {player.name}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="mt-4 bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">Cancelar</button>
            </div>
        </div>
    );
};


const LiveModeOverlay: React.FC<LiveModeOverlayProps> = ({ teamA, teamB, events, onAddGoal, onGiveCard, onTeamStatChange, onInitiateSub, onUpdatePlayerStat }) => {
    const [pickerContext, setPickerContext] = useState<PlayerPickerContext | null>(null);

    const openPicker = (teamId: TeamId, action: ActionType, targetTeamId?: TeamId) => {
        setPickerContext({ teamId, action, targetTeamId: targetTeamId || teamId });
    };

    const handlePlayerSelect = (playerId: number) => {
        if (!pickerContext) return;
        const { targetTeamId, action } = pickerContext;

        switch(action) {
            case 'goal':
                onAddGoal(targetTeamId, playerId);
                break;
            case 'yellow':
                onGiveCard(targetTeamId, playerId, 'yellow');
                break;
            case 'red':
                onGiveCard(targetTeamId, playerId, 'red');
                break;
            case 'offside':
                onUpdatePlayerStat(targetTeamId, playerId, 'offsidesCommitted', 'add');
                break;
            case 'goalChance':
                onUpdatePlayerStat(targetTeamId, playerId, 'goalChances', 'add');
                break;
        }
        setPickerContext(null);
    };

    const TeamStatsSummary: React.FC<{ team: Team }> = ({ team }) => {
        const teamOffsides = useMemo(() => 
            [...team.starters, ...team.subs].reduce((sum, p) => sum + p.offsidesCommitted.length, 0),
        [team]);

        const teamGoalChances = useMemo(() =>
            [...team.starters, ...team.subs].reduce((sum, p) => sum + p.goalChances.length, 0),
        [team]);

        return (
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Ocasiones de Gol:</span>
                    <span className="font-bold text-white text-lg">{teamGoalChances}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Córners:</span>
                    <span className="font-bold text-white text-lg">{team.cornersFor.length}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Faltas Cometidas:</span>
                    <span className="font-bold text-white text-lg">{team.foulsCommitted.length}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Fueras de Juego:</span>
                    <span className="font-bold text-white text-lg">{teamOffsides}</span>
                </div>
            </div>
        )
    }

    const TeamActionPanel: React.FC<{ team: Team, teamId: TeamId, opponentId: TeamId }> = ({ team, teamId, opponentId }) => (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-center mb-2">{team.name}</h2>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => openPicker(teamId, 'goal')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 rounded-lg text-lg flex items-center justify-center gap-2">
                    <BallIcon className="w-6 h-6" /> Gol
                </button>
                <button onClick={() => openPicker(teamId, 'goalChance')} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-6 rounded-lg text-lg flex items-center justify-center gap-2">
                    <CrosshairIcon className="w-6 h-6" /> Ocasión
                </button>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => onTeamStatChange(teamId, 'foulsCommitted', 'add')} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-lg text-lg">
                    Falta Cometida
                </button>
                 <button onClick={() => onTeamStatChange(opponentId, 'foulsCommitted', 'add')} className="bg-orange-400 hover:bg-orange-500 text-black font-bold py-4 rounded-lg text-lg">
                    Falta Recibida
                </button>
            </div>
             <button onClick={() => openPicker(teamId, 'offside')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg text-lg">
                Fuera de Juego
            </button>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => openPicker(teamId, 'yellow')} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-6 rounded-lg text-lg flex items-center justify-center gap-2">
                    <CardIcon /> Amarilla
                </button>
                <button onClick={() => openPicker(teamId, 'red')} className="bg-red-500 hover:bg-red-600 text-white font-bold py-6 rounded-lg text-lg flex items-center justify-center gap-2">
                    <CardIcon /> Roja
                </button>
            </div>
             <button onClick={() => onTeamStatChange(teamId, 'cornersFor', 'add')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 rounded-lg text-lg">
                Córner
            </button>
            <button onClick={() => onInitiateSub(teamId)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-lg text-xl flex items-center justify-center gap-3">
                <SubstituteIcon /> Sustitución
            </button>
            <TeamStatsSummary team={team} />
        </div>
    );
    
    const pickerTeam = pickerContext?.targetTeamId === 'a' ? teamA : teamB;

    const latestEvents = [...events].slice(-5).reverse();

    return (
        <div className="animate-fade-in">
             {pickerContext && pickerTeam && (
                <PlayerPickerModal
                    isOpen={true}
                    team={pickerTeam}
                    action={pickerContext.action}
                    onClose={() => setPickerContext(null)}
                    onSelect={handlePlayerSelect}
                />
             )}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 p-4 items-start">
                <TeamActionPanel team={teamA} teamId="a" opponentId="b" />

                <div className="flex flex-col items-center mt-12 gap-6">
                     <span className="text-5xl font-bold bg-black/30 px-6 py-3 rounded-lg">
                        {teamA.score} - {teamB.score}
                    </span>
                    <div className="w-full max-w-xs space-y-2">
                        <h3 className="text-center font-semibold text-cyan-400">Últimos Eventos</h3>
                        {latestEvents.map(event => (
                            <div key={event.eventKey} className="flex items-center gap-2 p-1.5 bg-gray-800/60 rounded text-xs">
                                <span className="font-bold w-8 text-center">{event.minute}'</span>
                                <EventIcon type={event.type} />
                                <span className="truncate">{event.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <TeamActionPanel team={teamB} teamId="b" opponentId="a" />
            </div>
        </div>
    );
};

export default LiveModeOverlay;