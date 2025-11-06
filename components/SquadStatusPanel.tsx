import React, { useMemo } from 'react';
import type { Match, RosterPlayer, TrainingSession, AttendanceStatus } from '../types';
import { ATTENDANCE_STATUSES } from '../types';
import { CheckCircleIcon, XCircleIcon, HeartPulseIcon, AcademicCapIcon, SunIcon, QuestionMarkCircleIcon, CakeIcon } from './icons';

interface SquadStatusPanelProps {
    roster: RosterPlayer[];
    nextMatch: Match | null;
    lastTrainingSession: TrainingSession | null;
    lastTrainingDate: string | null;
}

const getAttendanceIcon = (status: AttendanceStatus) => {
    switch (status) {
        case ATTENDANCE_STATUSES.PRESENT:
            return <CheckCircleIcon className="text-green-400 flex-shrink-0" />;
        case ATTENDANCE_STATUSES.ABSENT:
            return <XCircleIcon className="text-red-400 flex-shrink-0" />;
        case ATTENDANCE_STATUSES.INJURED:
            return <HeartPulseIcon className="text-red-500 flex-shrink-0" />;
        case ATTENDANCE_STATUSES.STUDIES:
            return <AcademicCapIcon className="text-blue-400 flex-shrink-0" />;
        case ATTENDANCE_STATUSES.HOLIDAYS:
            return <SunIcon className="text-yellow-400 flex-shrink-0" />;
        case ATTENDANCE_STATUSES.OTHER:
        default:
            return <QuestionMarkCircleIcon className="text-gray-400 flex-shrink-0" />;
    }
};

const getUnavailabilityIcon = (reason: string) => {
    switch (reason) {
        case 'Lesión':
            return <HeartPulseIcon className="text-red-500 flex-shrink-0" />;
        case 'Estudios':
            return <AcademicCapIcon className="text-blue-400 flex-shrink-0" />;
        case 'Viaje':
            return <SunIcon className="text-yellow-400 flex-shrink-0" />;
        case 'Otro':
        default:
            return <QuestionMarkCircleIcon className="text-gray-400 flex-shrink-0" />;
    }
};


const PlayerStatusItem: React.FC<{
    player: RosterPlayer;
    icon: React.ReactNode;
    statusText: string;
}> = ({ player, icon, statusText }) => (
    <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-3 truncate">
            <span className="font-mono text-sm text-gray-400 w-6 text-center">{player.number}</span>
            <span className="truncate text-sm">{player.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300 flex-shrink-0">
            {icon}
            <span className="hidden sm:inline-block w-20 text-right">{statusText}</span>
        </div>
    </div>
);

const SquadStatusPanel: React.FC<SquadStatusPanelProps> = ({ roster, nextMatch, lastTrainingSession, lastTrainingDate }) => {
    
    const sortedRoster = useMemo(() => [...roster].sort((a,b) => a.number - b.number), [roster]);

    const unavailablePlayers = useMemo(() => 
        sortedRoster.filter(p => p.availability?.status === 'No Disponible'), 
    [sortedRoster]);

    const nextBirthday = useMemo(() => {
        if (roster.length === 0) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayYear = today.getFullYear();

        const birthdaysThisYear = roster
            .filter(p => p.dateOfBirth)
            .map(p => {
                const birthDate = new Date(p.dateOfBirth + 'T00:00:00');
                const nextBirthdayDate = new Date(birthDate.getTime());
                nextBirthdayDate.setFullYear(todayYear);

                if (nextBirthdayDate < today) {
                    nextBirthdayDate.setFullYear(todayYear + 1);
                }
                return { player: p, date: nextBirthdayDate };
            });

        if (birthdaysThisYear.length === 0) return null;

        birthdaysThisYear.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        return birthdaysThisYear[0];

    }, [roster]);

    const { present, absent } = useMemo(() => {
        if (!lastTrainingSession) return { present: [], absent: [] };

        const presentList: {player: RosterPlayer, status: AttendanceStatus}[] = [];
        const absentList: {player: RosterPlayer, status: AttendanceStatus}[] = [];

        sortedRoster.forEach(player => {
            const status = lastTrainingSession.attendance?.[player.id] || ATTENDANCE_STATUSES.ABSENT;
            if (status === ATTENDANCE_STATUSES.PRESENT) {
                presentList.push({ player, status });
            } else {
                absentList.push({ player, status });
            }
        });
        return { present: presentList, absent: absentList };
    }, [sortedRoster, lastTrainingSession]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-center">Estado de la Plantilla</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Training Column */}
                <div className="bg-gray-900/50 p-3 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-cyan-400">Último Entrenamiento</h3>
                    {lastTrainingSession ? (
                        <>
                            <p className="text-xs text-gray-400 mb-2">
                                {lastTrainingDate && new Date(lastTrainingDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                <div>
                                    <h4 className="font-semibold text-green-400 text-sm mb-1">Presentes ({present.length})</h4>
                                    {present.map(({ player, status }) => (
                                        <PlayerStatusItem 
                                            key={player.id}
                                            player={player}
                                            icon={getAttendanceIcon(status)}
                                            statusText={status}
                                        />
                                    ))}
                                </div>
                                {absent.length > 0 && 
                                    <div>
                                        <h4 className="font-semibold text-red-400 text-sm mt-3 mb-1">Ausencias ({absent.length})</h4>
                                        {absent.map(({ player, status }) => (
                                            <PlayerStatusItem 
                                                key={player.id}
                                                player={player}
                                                icon={getAttendanceIcon(status)}
                                                statusText={status}
                                            />
                                        ))}
                                    </div>
                                }
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-gray-500 h-full flex items-center justify-center">
                            <p>No hay datos de entrenamientos recientes.</p>
                        </div>
                    )}
                </div>

                {/* Info Column */}
                <div className="bg-gray-900/50 p-3 rounded-lg space-y-4">
                     <div>
                        <h3 className="font-bold text-lg mb-2 text-cyan-400">Próximo Partido</h3>
                         {nextMatch ? (
                            <div className="bg-gray-800 p-3 rounded-md">
                                 <p className="text-sm font-semibold">
                                    vs {nextMatch.details.opponentName}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {new Date(nextMatch.details.matchTime).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500">
                                <p>No hay un próximo partido.</p>
                            </div>
                        )}
                    </div>
                    
                     <div>
                        <h3 className="font-bold text-lg mb-2 text-cyan-400">Próximo Cumpleaños</h3>
                         {nextBirthday ? (
                            <div className="bg-gray-800 p-3 rounded-md flex items-center gap-4">
                               <CakeIcon className="text-pink-400 w-8 h-8 flex-shrink-0"/>
                               <div>
                                    <p className="font-semibold">{nextBirthday.player.name}</p>
                                    <p className="text-sm text-gray-300">
                                        {nextBirthday.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                                    </p>
                               </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500">
                                <p>No hay cumpleaños próximos.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Unavailable Players Column */}
                <div className="bg-gray-900/50 p-3 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-red-400">No Disponibles (Plantilla)</h3>
                     <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                        {unavailablePlayers.length > 0 ? (
                            unavailablePlayers.map(player => (
                                <PlayerStatusItem 
                                    key={player.id}
                                    player={player}
                                    icon={getUnavailabilityIcon(player.availability!.reason)}
                                    statusText={player.availability!.reason}
                                />
                            ))
                        ) : (
                           <div className="text-center py-10 text-gray-500 h-full flex items-center justify-center">
                                <p>Toda la plantilla está disponible.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SquadStatusPanel;