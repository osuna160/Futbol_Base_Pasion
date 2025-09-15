import React, { useMemo } from 'react';
import type { Match, RosterPlayer, TrainingSession, AttendanceStatus } from '../types';
import { ATTENDANCE_STATUSES } from '../types';
import { CheckCircleIcon, XCircleIcon, HeartPulseIcon, AcademicCapIcon, SunIcon, QuestionMarkCircleIcon } from './icons';

interface SquadStatusPanelProps {
    roster: RosterPlayer[];
    nextMatch: Match | null;
    lastTrainingSession: TrainingSession | null;
    lastTrainingDate: string | null;
}

const getAttendanceIcon = (status: AttendanceStatus | 'Desconocido') => {
    switch (status) {
        case ATTENDANCE_STATUSES.PRESENT:
            return <CheckCircleIcon className="text-green-400" />;
        case ATTENDANCE_STATUSES.ABSENT:
            return <XCircleIcon className="text-red-400" />;
        case ATTENDANCE_STATUSES.INJURED:
            return <HeartPulseIcon className="text-red-500" />;
        case ATTENDANCE_STATUSES.STUDIES:
            return <AcademicCapIcon className="text-blue-400" />;
        case ATTENDANCE_STATUSES.HOLIDAYS:
            return <SunIcon className="text-yellow-400" />;
        case ATTENDANCE_STATUSES.OTHER:
            return <QuestionMarkCircleIcon className="text-gray-400" />;
        default:
            return <QuestionMarkCircleIcon className="text-gray-500" />;
    }
};

const getMatchStatusIcon = (status: 'Convocada' | 'No Convocada' | 'Desconocido') => {
    switch (status) {
        case 'Convocada':
            return <CheckCircleIcon className="text-green-400" />;
        case 'No Convocada':
            return <XCircleIcon className="text-red-400" />;
        default:
            return <QuestionMarkCircleIcon className="text-gray-500" />;
    }
}

const PlayerStatusItem: React.FC<{
    name: string;
    number: number;
    icon: React.ReactNode;
    statusText: string;
    details?: string;
}> = ({ name, number, icon, statusText, details }) => (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-3 truncate">
            <span className="font-mono text-sm text-gray-400 w-6 text-center">{number}</span>
            <span className="truncate">{name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm flex-shrink-0">
            {icon}
            <span className="w-24 text-right">{statusText}</span>
            {details && <span className="text-xs text-gray-400">({details})</span>}
        </div>
    </div>
);

const SquadStatusPanel: React.FC<SquadStatusPanelProps> = ({ roster, nextMatch, lastTrainingSession, lastTrainingDate }) => {
    
    const sortedRoster = useMemo(() => [...roster].sort((a,b) => a.number - b.number), [roster]);

    const trainingStatusList = useMemo(() => {
        if (!lastTrainingSession) return [];
        return sortedRoster.map(player => {
            const status = lastTrainingSession.attendance?.[player.id] || 'Desconocido';
            return {
                player,
                status: status as AttendanceStatus | 'Desconocido'
            };
        });
    }, [sortedRoster, lastTrainingSession]);
    
    const matchStatusList = useMemo(() => {
        if (!nextMatch) return [];

        const startersIds = new Set(nextMatch.myTeamSetup.starters.map(p => p.playerId));
        const subsIds = new Set(nextMatch.myTeamSetup.subs.map(p => p.id));
        const unavailableMap = new Map(nextMatch.myTeamSetup.unavailable.map(p => [p.id, p.reason]));

        return sortedRoster.map(player => {
            if (startersIds.has(player.id) || subsIds.has(player.id)) {
                return { player, status: 'Convocada' as const, reason: undefined };
            }
            if (unavailableMap.has(player.id)) {
                return { player, status: 'No Convocada' as const, reason: unavailableMap.get(player.id) };
            }
            return { player, status: 'No Convocada' as const, reason: 'Decisión técnica' };
        });

    }, [sortedRoster, nextMatch]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-center">Estado de la Plantilla</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Training Column */}
                <div className="bg-gray-900/50 p-3 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-cyan-400">Último Entrenamiento</h3>
                    {lastTrainingSession ? (
                        <>
                            <p className="text-xs text-gray-400 mb-2">
                                {lastTrainingDate && new Date(lastTrainingDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                                {trainingStatusList.map(({ player, status }) => (
                                    <PlayerStatusItem 
                                        key={player.id}
                                        name={player.name}
                                        number={player.number}
                                        icon={getAttendanceIcon(status)}
                                        statusText={status}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            No hay datos de entrenamientos recientes.
                        </div>
                    )}
                </div>

                {/* Match Squad Column */}
                <div className="bg-gray-900/50 p-3 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-cyan-400">Próxima Convocatoria</h3>
                     {nextMatch ? (
                        <>
                             <p className="text-xs text-gray-400 mb-2">
                                vs {nextMatch.details.opponentName} - {new Date(nextMatch.details.matchTime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </p>
                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                                 {matchStatusList.map(({ player, status, reason }) => (
                                    <PlayerStatusItem 
                                        key={player.id}
                                        name={player.name}
                                        number={player.number}
                                        icon={getMatchStatusIcon(status)}
                                        statusText={status}
                                        details={reason}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            No hay un próximo partido programado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SquadStatusPanel;