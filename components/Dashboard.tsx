import React, { useState, useMemo } from 'react';
import type { Match, MatchType, RosterPlayer, TrainingSession, Team, Player, TeamId } from '../types';
import { MATCH_TYPES } from '../types';
import MatchCard from './MatchCard';
import ReportModal from './ReportModal';
import SquadStatusPanel from './SquadStatusPanel';
import { getFormationData } from '../constants';
import Formations from './Formations';
import { ExternalLinkIcon } from './icons';

interface DashboardProps {
  matches: Match[];
  roster: RosterPlayer[];
  sessions: Record<string, TrainingSession[]>;
  onNewMatch: () => void;
  onGoToRoster: () => void;
  onGoToTraining: () => void;
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
    goals: [], foulsCommitted: [], penaltiesCommitted: [], penaltiesMissed: [], offsidesCommitted: [],
    goalsConceded: [], saves: [], penaltiesSaved: [],
});

const createGenericTeam = (teamId: TeamId): Team => {
    const formation = '4-3-3';
    const formationData = getFormationData(formation);
    const starters = formationData.map((posInfo, index) => createGenericPlayer(index + 1, posInfo));
    return {
        name: teamId === 'a' ? 'Equipo Local' : 'Equipo Visitante',
        score: 0, starters, subs: [], formation, cornersFor: [], substitutionWindows: 3,
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
    onNewMatch, 
    onGoToRoster, 
    onGoToTraining,
    onStartOrResumeMatch,
    onEditMatch,
    onDeleteMatch
}) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'tactic-board' | 'results'>('matches');
    const [filter, setFilter] = useState<MatchType | 'Todos'>('Todos');
    const [reportMatch, setReportMatch] = useState<Match | null>(null);

    const nextMatch = useMemo(() => {
        const now = new Date().getTime();
        const futureMatches = matches
            .filter(m => m.details.matchTime && new Date(m.details.matchTime).getTime() > now)
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
        if (filter === 'Todos') {
            return sorted;
        }
        return sorted.filter(m => m.details.matchType === filter);
    }, [matches, filter]);
    
    const tabButtonStyle = (tabName: typeof activeTab) => `tab-nav-button ${activeTab === tabName ? 'active' : ''}`;

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Dashboard Principal</h1>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <button onClick={onGoToRoster} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Gestionar Equipo
                        </button>
                        <button onClick={onGoToTraining} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Gestionar Entrenamientos
                        </button>
                        <button onClick={onNewMatch} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            + Nuevo Partido
                        </button>
                    </div>
                </header>
                
                <div className="bg-gray-800 rounded-lg shadow-lg">
                    <div className="flex border-b border-gray-700 flex-wrap">
                        <button onClick={() => setActiveTab('matches')} className={tabButtonStyle('matches')}>
                            Panel de Partidos
                        </button>
                        <button onClick={() => setActiveTab('tactic-board')} className={tabButtonStyle('tactic-board')}>
                            Pizarra Táctica
                        </button>
                        <button onClick={() => setActiveTab('results')} className={tabButtonStyle('results')}>
                            Resultados FCF
                        </button>
                    </div>

                    <div className="p-4">
                        {activeTab === 'matches' && (
                            <div className="space-y-6">
                                <SquadStatusPanel 
                                    roster={roster}
                                    nextMatch={nextMatch}
                                    lastTrainingSession={lastTrainingSession}
                                    lastTrainingDate={lastTrainingDate}
                                />
                                <main>
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <h2 className="text-xl font-semibold">Mis Partidos ({filteredMatches.length})</h2>
                                        <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg">
                                            {(['Todos', ...MATCH_TYPES] as const).map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setFilter(f)}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                                        filter === f ? 'bg-cyan-500 text-white' : 'hover:bg-gray-700'
                                                    }`}
                                                >
                                                    {f}
                                                </button>
                                            ))}
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
                                                    onShowReport={() => setReportMatch(match)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 bg-gray-900/50 rounded-lg">
                                            <h3 className="text-xl font-semibold">No hay partidos que mostrar</h3>
                                            <p className="text-gray-400 mt-2">
                                                {filter === 'Todos'
                                                    ? 'Crea un nuevo partido para empezar.'
                                                    : `No se encontraron partidos del tipo "${filter}".`}
                                            </p>
                                        </div>
                                    )}
                                </main>
                            </div>
                        )}
                        {activeTab === 'tactic-board' && (
                            <TacticalBoardView />
                        )}
                        {activeTab === 'results' && (
                            <div className="text-center p-8 sm:p-16 bg-gray-900/50 rounded-lg">
                                <h3 className="text-2xl font-bold text-white mb-4">Resultados de la FCF</h3>
                                <p className="text-gray-300 mb-8 max-w-lg mx-auto">
                                    La página de resultados de la Federació Catalana de Futbol no permite ser integrada directamente aquí.
                                    Haz clic en el botón de abajo para abrirla en una nueva pestaña.
                                </p>
                                <a
                                    href="https://www.fcf.cat/resultats"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform hover:scale-105"
                                >
                                    <ExternalLinkIcon />
                                    Abrir Resultados FCF
                                </a>
                            </div>
                        )}
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
                />
            )}
        </>
    );
};

export default Dashboard;