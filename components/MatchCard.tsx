import React from 'react';
import type { Match } from '../types';
import { MatchState } from '../types';

interface MatchCardProps {
    match: Match;
    onStartOrResume: (id: number) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    onShowReport: (id: number) => void;
}

const getMatchStatus = (matchState: MatchState): { text: string; color: string } => {
    switch (matchState) {
        case MatchState.NOT_STARTED:
            return { text: 'Programado', color: 'bg-gray-500' };
        case MatchState.FULL_TIME:
            return { text: 'Finalizado', color: 'bg-blue-600' };
        default:
            return { text: 'En Progreso', color: 'bg-green-600 animate-pulse' };
    }
};

const MatchCard: React.FC<MatchCardProps> = ({ match, onStartOrResume, onEdit, onDelete, onShowReport }) => {
    const { details, teamA, teamB, matchState } = match;
    const status = getMatchStatus(matchState);

    const homeTeamName = details.myTeamLocation === 'home' ? 'Sant Gabriel C.E. FCA' : details.opponentName;
    const awayTeamName = details.myTeamLocation === 'away' ? 'Sant Gabriel C.E. FCA' : details.opponentName;
    
    const homeTeamScore = teamA && teamB ? (details.myTeamLocation === 'home' ? teamA.score : teamB.score) : '-';
    const awayTeamScore = teamA && teamB ? (details.myTeamLocation === 'away' ? teamA.score : teamB.score) : '-';

    const matchDate = details.matchTime ? new Date(details.matchTime) : null;

    const matchTypeDisplay = (() => {
        if (details.matchType === 'Liga' && details.jornada) {
            return `${details.matchType} - J${details.jornada}`;
        }
        if (details.matchType === 'Torneo' && details.tournamentStage) {
            return `${details.matchType} - ${details.tournamentStage}`;
        }
        return details.matchType;
    })();

    return (
        <div className="match-card">
            <div className="flex justify-between items-start">
                <div>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${status.color}`}>
                        {status.text}
                    </span>
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full text-gray-200 bg-gray-600">
                        {matchTypeDisplay}
                    </span>
                </div>
                {matchDate && (
                    <div className="text-right text-xs text-gray-400">
                        <div>{matchDate.toLocaleDateString('es-ES')}</div>
                        <div>{matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 my-2">
                <span className="font-semibold text-lg truncate text-right">{homeTeamName}</span>
                <span className="font-bold text-2xl mx-2 bg-gray-900/50 px-3 py-1 rounded-md">
                    {homeTeamScore} - {awayTeamScore}
                </span>
                <span className="font-semibold text-lg truncate text-left">{awayTeamName}</span>
            </div>

            <div className="flex justify-end items-center gap-2 border-t border-gray-700 pt-3 mt-auto">
                {matchState === MatchState.FULL_TIME && (
                     <button
                        onClick={() => onShowReport(match.id)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded text-sm"
                    >
                        Informe
                    </button>
                )}
                {matchState !== MatchState.FULL_TIME && (
                    <button
                        onClick={() => onStartOrResume(match.id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                    >
                        {matchState === MatchState.NOT_STARTED ? 'Iniciar' : 'Reanudar'}
                    </button>
                )}
                 <button
                    onClick={() => matchState === MatchState.FULL_TIME ? onStartOrResume(match.id) : onEdit(match.id)}
                    className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-1 px-3 rounded text-sm"
                >
                    {matchState === MatchState.FULL_TIME ? 'Ver Eventos' : 'Configurar'}
                </button>
                 <button
                    onClick={() => onDelete(match.id)}
                    className="bg-red-800 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded text-sm"
                >
                    Eliminar
                </button>
            </div>
        </div>
    );
};

export default MatchCard;