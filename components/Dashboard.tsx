import React, { useState, useMemo } from 'react';
import type { Match, MatchType, RosterPlayer, TrainingSession, Team, Player, TeamId, TeamSettings, OpponentTeam } from '../types';
import { MATCH_TYPES, MatchState } from '../types';
import MatchCard from './MatchCard';
import ReportModal from './ReportModal';
import SquadStatusPanel from './SquadStatusPanel';
import { getFormationData } from '../constants';
import Formations from './Formations';
import PlayerStatsDashboard from './PlayerStatsDashboard';
import { CameraIcon } from './icons';
import OpponentTeamsDashboard from './OpponentTeamsDashboard';

interface DashboardProps {
  matches: Match[];
  roster: RosterPlayer[];
  sessions: Record<string, TrainingSession[]>;
  teamSettings: TeamSettings;
  opponentTeams: OpponentTeam[];
  onOpponentTeamsChange: (teams: OpponentTeam[]) => void;
  onNewMatch: () => void;
  onGoToRoster: () => void;
  onGoToTraining: () => void;
  onGoToMedia: () => void;
  onStartOrResumeMatch: (id: number) => void;
  onEditMatch: (id: number) => void;
  onDeleteMatch: (id: number) => void;
}

const createGenericPlayer = (id: number, posInfo: { pos: { x: number; y: number }; name: string; abbr: string }): Player => ({
    id,
    name: posInfo.abbr,
    number: id,
    positionName: posInfo.name,
    positionAbbr: posInfo.abbr,
    yellowCards: [], redCard: null, isSentOff: false, isOnField: true,
    isGoalkeeper: posInfo.name === 'Portera', position: posInfo.pos,
    goals: [],
    goalChances: [],
    penaltiesCommitted: [], penaltiesMissed: [], offsidesCommitted: [],
    goalsConceded: [], saves: [], penaltiesSaved: [],
});

const createGenericTeam = (teamId: TeamId): Team => {
    const formation = '4-3-3';
    const formationData = getFormationData(formation);
    const starters = formationData.map((posInfo, index) => createGenericPlayer(index + 1, posInfo));
    return {
        name: teamId === 'a' ? 'Equipo Local' : 'Equipo Visitante',
        score: 0, starters, subs: [], unavailable: [], formation, cornersFor: [], substitutionWindows: 3,
        foulsCommitted: [],
    };
};

const TacticalBoardView: React.FC = () => {
    const [teamA, setTeamA] = useState(() => createGenericTeam('a'));
    const [teamB, setTeamB] = useState(() => createGenericTeam('b'));

    const updateTeam = (teamId: TeamId, updateFn: (team: Team) => Team) => {
        if (teamId === 'a') {
            setTeamA(updateFn);
        } else {
            setTeamB(updateFn);
        }
    };
    
    const handlePlayerMove = (teamId: TeamId, playerId: number, position: { x: number; y: number }) => {
        updateTeam(teamId, team => ({
            ...team,
            starters: team.starters.map(p => p.id === playerId ? { ...p, position } : p)
        }));
    };

    const handleFormationChange = (teamId: TeamId, formation: string) => {
        updateTeam(teamId, team => {
            const formationData = getFormationData(formation);
            return {
                ...team,
                formation,
                starters: team.starters.map((player, index) => ({
                    ...player,
                    position: formationData[index].pos,
                    positionName: formationData[index].name,
                    positionAbbr: formationData[index].abbr,
                }))
            };
        });
    };

    return <Formations teamA={teamA} teamB={teamB} onPlayerMove={handlePlayerMove} onFormationChange={handleFormationChange} />;
};


const Dashboard: React.FC<DashboardProps> = ({ 
    matches, 
    roster,
    sessions,
    teamSettings,
    opponentTeams,
    onOpponentTeamsChange,
    onNewMatch, 
    onGoToRoster, 
    onGoToTraining,
    onGoToMedia,
    onStartOrResumeMatch,
    onEditMatch,
    onDeleteMatch,
}) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'matches' | 'players' | 'tactic-board' | 'opponents'>('summary');
    const [typeFilter, setTypeFilter] = useState<MatchType | 'Todos'>('Todos');
    const [statusFilter, setStatusFilter] = useState<'Todos' | 'Programado' | 'En Progreso' | 'Finalizado'>('Todos');
    const [reportMatch, setReportMatch] = useState<Match | null>(null);

    const nextMatch = useMemo(() => {
        const now = new Date().getTime();
        const futureMatches = matches
            .filter(m => m.details.matchTime && new Date(m.details.matchTime).getTime() > now && m.matchState === MatchState.NOT_STARTED)
            .sort((a, b) => new Date(a.details.matchTime).getTime() - new Date(b.details.matchTime).getTime());
        return futureMatches[0] || null;
    }, [matches]);

    const { lastTrainingSession, lastTrainingDate } = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999); // Include today
        const pastSessionDates = Object.keys(sessions)
            .filter(dateKey => new Date(dateKey) <= now)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        if (pastSessionDates.length > 0) {
            const lastDateKey = pastSessionDates[0];
            const sessionsOnLastDay = sessions[lastDateKey] || [];
            if (sessionsOnLastDay.length > 0) {
                sessionsOnLastDay.sort((a, b) => b.startTime.localeCompare(a.startTime));
                return { lastTrainingSession: sessionsOnLastDay[0], lastTrainingDate: lastDateKey };
            }
        }
        return { lastTrainingSession: null, lastTrainingDate: null };
    }, [sessions]);

    const filteredMatches = useMemo(() => {
        const sorted = [...matches].sort((a, b) => {
            const dateA = a.details.matchTime ? new Date(a.details.matchTime).getTime() : 0;
            const dateB = b.details.matchTime ? new Date(b.details.matchTime).getTime() : 0;
            return dateB - dateA;
        });
        
        const getStatusText = (matchState: MatchState): 'Programado' | 'En Progreso' | 'Finalizado' => {
            switch (matchState) {
                case MatchState.NOT_STARTED: return 'Programado';
                case MatchState.FULL_TIME: return 'Finalizado';
                default: return 'En Progreso';
            }
        };

        return sorted.filter(m => {
            const typeMatch = typeFilter === 'Todos' || m.details.matchType === typeFilter;
            const statusMatch = statusFilter === 'Todos' || getStatusText(m.matchState) === statusFilter;
            return typeMatch && statusMatch;
        });

    }, [matches, typeFilter, statusFilter]);

    const handleShowReport = (matchId: number) => {
        const matchToShow = matches.find(m => m.id === matchId);
        if (matchToShow) {
            setReportMatch(matchToShow);
        }
    };
    
    const tabButtonStyle = (tabName: typeof activeTab) => `tab-nav-button ${activeTab === tabName ? 'active' : ''}`;
    
    const STATUS_FILTERS = ['Todos', 'Programado', 'En Progreso', 'Finalizado'] as const;

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Dashboard Principal</h1>
                    <div className="flex gap-2 flex-wrap justify-center items-center">
                        <button onClick={onGoToRoster} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Gestionar Equipo
                        </button>
                        <button onClick={onGoToTraining} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Gestionar Entrenamientos
                        </button>
                        <button onClick={onGoToMedia} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors inline-flex items-center gap-2">
                           <CameraIcon/> Multimedia
                        </button>
                    </div>
                </header>
                
                <div className="bg-gray-800 rounded-lg shadow-lg">
                    <div className="flex border-b border-gray-700 flex-wrap">
                        <button onClick={() => setActiveTab('summary')} className={tabButtonStyle('summary')}>
                            Resumen
                        </button>
                        <button onClick={() => setActiveTab('matches')} className={tabButtonStyle('matches')}>
                            Mis Partidos
                        </button>
                         <button onClick={() => setActiveTab('players')} className={tabButtonStyle('players')}>
                            Jugadoras
                        </button>
                        <button onClick={() => setActiveTab('tactic-board')} className={tabButtonStyle('tactic-board')}>
                            Pizarra Táctica
                        </button>
                        <button onClick={() => setActiveTab('opponents')} className={tabButtonStyle('opponents')}>
                            Equipos Rivales
                        </button>
                    </div>

                    <div className="p-4">
                        {activeTab === 'summary' && (
                             <SquadStatusPanel 
                                roster={roster}
                                nextMatch={nextMatch}
                                lastTrainingSession={lastTrainingSession}
                                lastTrainingDate={lastTrainingDate}
                            />
                        )}
                        {activeTab === 'matches' && (
                            <div className="space-y-6">
                                <main>
                                    <div className="flex flex-col md:flex-row items-center justify-between mb-4 flex-wrap gap-4">
                                        <div className="flex-grow">
                                            <button onClick={onNewMatch} className="bg-[var(--primary-color)] hover:brightness-90 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                                + Nuevo Partido
                                            </button>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-400">Estado:</span>
                                                <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg">
                                                    {STATUS_FILTERS.map(f => (
                                                        <button
                                                            key={f}
                                                            onClick={() => setStatusFilter(f)}
                                                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                                                statusFilter === f ? 'bg-indigo-500 text-white' : 'hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-400">Tipo:</span>
                                                <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg">
                                                    {(['Todos', ...MATCH_TYPES] as const).map(f => (
                                                        <button
                                                            key={f}
                                                            onClick={() => setTypeFilter(f)}
                                                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                                                typeFilter === f ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {filteredMatches.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {filteredMatches.map(match => (
                                                <MatchCard
                                                    key={match.id}
                                                    match={match}
                                                    onStartOrResume={onStartOrResumeMatch}
                                                    onEdit={onEditMatch}
                                                    onDelete={onDeleteMatch}
                                                    onShowReport={handleShowReport}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 bg-gray-900/50 rounded-lg">
                                            <h3 className="text-xl font-semibold">No hay partidos que mostrar</h3>
                                            <p className="text-gray-400 mt-2">
                                                {typeFilter === 'Todos' && statusFilter === 'Todos'
                                                    ? 'Crea un nuevo partido para empezar.'
                                                    : 'No se encontraron partidos con los filtros seleccionados.'}
                                            </p>
                                        </div>
                                    )}
                                </main>
                            </div>
                        )}
                        {activeTab === 'players' && (
                            <PlayerStatsDashboard roster={roster} matches={matches} />
                        )}
                        {activeTab === 'tactic-board' && (
                            <TacticalBoardView />
                        )}
                        {activeTab === 'opponents' && (
                            <OpponentTeamsDashboard
                                opponentTeams={opponentTeams}
                                onOpponentTeamsChange={onOpponentTeamsChange}
                            />
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-lg p-4">
                    <h2 className="text-xl font-bold text-white mb-4">Resultados y Clasificación FCF</h2>
                    <div className="w-full h-[80vh] bg-gray-900 rounded-md overflow-hidden border-2 border-gray-700">
                         <iframe
                            src="https://www.fcf.cat/resum/2526/futbol-femeni/primera-divisio-femeni-cadet-f11/grup-1"
                            title="Resultados FCF"
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin"
                        ></iframe>
                    </div>
                </div>
            </div>
            {reportMatch && reportMatch.teamA && reportMatch.teamB && (
                <ReportModal
                    isOpen={!!reportMatch}
                    onClose={() => setReportMatch(null)}
                    teamA={reportMatch.teamA}
                    teamB={reportMatch.teamB}
                    matchDetails={reportMatch.details}
                    halfDurationMinutes={reportMatch.halfDurationMinutes}
                    substitutionLog={reportMatch.substitutionLog}
                    initialStartersA={reportMatch.initialStartersA}
                    initialStartersB={reportMatch.initialStartersB}
                    teamSettings={teamSettings}
                />
            )}
        </>
    );
};

export default Dashboard;