import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Match, Team, Player, StarterSetup, SubSetup, RosterPlayer, TrainingSession, TeamSetup, MatchDetails } from './types';
import { MatchState } from './types';
import { getInitialTeamSetup, getInitialMatchDetails, getFormationData, MY_TEAM_NAME, getInitialMyTeamSetup } from './constants';
import Setup from './components/Setup';
import MatchControl from './components/MatchControl';
import Dashboard from './components/Dashboard';
import TeamRoster from './components/TeamRoster';
import TrainingDashboard from './components/TrainingDashboard';
import ConfirmationModal from './components/ConfirmationModal';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'dashboard' | 'setup' | 'control' | 'roster' | 'training'>('dashboard');
    const [matches, setMatches] = useState<Match[]>([]);
    const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
    const [myTeamRoster, setMyTeamRoster] = useState<RosterPlayer[]>([]);
    const [trainingSessions, setTrainingSessions] = useState<Record<string, TrainingSession[]>>({});
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        matchId: number | null;
        callback?: () => void;
    }>({ isOpen: false, matchId: null });

    useEffect(() => {
        const loadData = (key: string, setter: (data: any) => void, errorMsg: string) => {
            const savedString = localStorage.getItem(key);
            if (savedString) {
                try {
                    setter(JSON.parse(savedString));
                } catch (error) {
                    console.error(`${errorMsg}:`, error);
                }
            }
        };
        loadData('myTeamRoster', setMyTeamRoster, "Failed to parse roster");
        loadData('trainingSessions', setTrainingSessions, "Failed to parse training sessions");
        loadData('footballMatches', (data) => {
            // Basic validation
            if (Array.isArray(data)) {
                setMatches(data);
            }
        }, "Failed to parse matches");
    }, []);
    
    const saveData = (key: string, data: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Failed to save ${key} to localStorage:`, error);
        }
    };

    useEffect(() => { saveData('myTeamRoster', myTeamRoster); }, [myTeamRoster]);
    useEffect(() => { saveData('trainingSessions', trainingSessions); }, [trainingSessions]);
    useEffect(() => { saveData('footballMatches', matches); }, [matches]);

    const activeMatch = useMemo(() => matches.find(m => m.id === activeMatchId), [matches, activeMatchId]);

    const handleUpdateMatch = useCallback((updatedMatch: Match) => {
        setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    }, []);

    const handleGoToSetup = (matchIdToEdit?: number) => {
        if (matchIdToEdit) {
            setActiveMatchId(matchIdToEdit);
        } else {
            const newMatch: Match = {
                id: Date.now(),
                details: getInitialMatchDetails(),
                myTeamSetup: getInitialMyTeamSetup(myTeamRoster),
                opponentTeamSetup: getInitialTeamSetup(),
                teamA: null, teamB: null,
                matchState: MatchState.NOT_STARTED,
                totalSeconds: 0,
                halfDurationMinutes: 40,
                substitutionLog: [],
                initialStartersA: [], initialStartersB: [],
                media: [],
            };
            setMatches(prev => [...prev, newMatch]);
            setActiveMatchId(newMatch.id);
        }
        setCurrentView('setup');
    };

    const handleStartOrResumeMatch = (matchId: number) => {
        const matchToStart = matches.find(m => m.id === matchId);
        if (!matchToStart) return;

        let matchRequiresUpdate = false;
        const updatedMatch = { ...matchToStart };

        if (updatedMatch.teamA === null || updatedMatch.teamB === null) {
            matchRequiresUpdate = true;
            // First time starting the match, convert setup to teams
            const createPlayerFromSetup = (
                playerData: StarterSetup | SubSetup, 
                id: number, 
                isOnField: boolean, 
                positionInfo: { pos: { x: number, y: number }, name: string, abbr: string }
            ): Player => ({
                id, name: playerData.playerName, number: playerData.playerNumber,
                positionName: positionInfo.name, positionAbbr: positionInfo.abbr,
                yellowCards: [], redCard: null, isSentOff: false, isOnField,
                isGoalkeeper: positionInfo.name === 'Portera', position: positionInfo.pos,
                goals: [], foulsCommitted: [], penaltiesCommitted: [], penaltiesMissed: [], offsidesCommitted: [],
                goalsConceded: [], saves: [], penaltiesSaved: [],
            });

            const createTeamFromSetup = (
                teamSetup: TeamSetup, teamName: string, baseId: number
            ): Team => {
                const formationData = getFormationData(teamSetup.formation);
                const starters = teamSetup.starters
                    .filter(s => s.playerName && s.playerNumber)
                    .map((starter, index) => 
                        createPlayerFromSetup(starter, starter.playerId || (baseId + index), true, formationData[index])
                    );
                const starterPlayerIds = new Set(teamSetup.starters.map(s => s.playerId));
                const subs = teamSetup.subs
                    .filter(s => (s.playerName || s.playerNumber > 0) && !starterPlayerIds.has(s.id))
                    .map((sub, index) => 
                        createPlayerFromSetup(sub, sub.id, false, { pos: { x: -20, y: -20 }, name: 'Suplente', abbr: 'SUP'})
                    );
                return {
                    name: teamName, score: 0, logo: undefined, starters, subs,
                    formation: teamSetup.formation, cornersFor: [],
                    substitutionWindows: updatedMatch.details.matchType === 'Liga' ? 3 : 99,
                };
            };
            
            const myTeam = createTeamFromSetup(updatedMatch.myTeamSetup, MY_TEAM_NAME, 100);
            const opponentTeam = createTeamFromSetup(updatedMatch.opponentTeamSetup, updatedMatch.details.opponentName, 200);

            if (updatedMatch.details.myTeamLocation === 'home') {
                updatedMatch.teamA = myTeam;
                updatedMatch.teamB = opponentTeam;
            } else {
                updatedMatch.teamA = opponentTeam;
                updatedMatch.teamB = myTeam;
            }
        }
        
        // Capture initial starters snapshot if it hasn't been done
        if (updatedMatch.teamA && updatedMatch.initialStartersA.length === 0) {
            updatedMatch.initialStartersA = JSON.parse(JSON.stringify(updatedMatch.teamA.starters));
            matchRequiresUpdate = true;
        }
        if (updatedMatch.teamB && updatedMatch.initialStartersB.length === 0) {
            updatedMatch.initialStartersB = JSON.parse(JSON.stringify(updatedMatch.teamB.starters));
            matchRequiresUpdate = true;
        }

        if (matchRequiresUpdate) {
            handleUpdateMatch(updatedMatch);
        }
        
        setActiveMatchId(matchId);
        setCurrentView('control');
    };

    const handleDeleteMatch = (matchId: number, onDeleteCallback?: () => void) => {
        setDeleteConfirmation({
            isOpen: true,
            matchId: matchId,
            callback: onDeleteCallback,
        });
    };

    const confirmDelete = () => {
        if (deleteConfirmation.matchId !== null) {
            setMatches(prev => prev.filter(m => m.id !== deleteConfirmation.matchId));
            deleteConfirmation.callback?.();
        }
    };
    
    const handleBackToDashboard = () => {
        setActiveMatchId(null);
        setCurrentView('dashboard');
    };

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <Dashboard
                        matches={matches}
                        roster={myTeamRoster}
                        sessions={trainingSessions}
                        onNewMatch={() => handleGoToSetup()}
                        onGoToRoster={() => setCurrentView('roster')}
                        onGoToTraining={() => setCurrentView('training')}
                        onStartOrResumeMatch={handleStartOrResumeMatch}
                        onEditMatch={(id) => handleGoToSetup(id)}
                        onDeleteMatch={handleDeleteMatch}
                    />
                );
            case 'roster':
                return (
                    <TeamRoster
                        roster={myTeamRoster}
                        onRosterChange={setMyTeamRoster}
                        onBack={handleBackToDashboard}
                    />
                );
            case 'training':
                return (
                    <TrainingDashboard
                        sessions={trainingSessions}
                        onSessionsChange={setTrainingSessions}
                        onBack={handleBackToDashboard}
                        roster={myTeamRoster}
                    />
                );
            case 'setup':
                if (!activeMatch) return <div>Cargando...</div>;
                return (
                    <Setup
                        match={activeMatch}
                        onMatchChange={handleUpdateMatch}
                        onStartMatch={() => handleStartOrResumeMatch(activeMatch.id)}
                        onBackToDashboard={handleBackToDashboard}
                        onDeleteMatch={handleDeleteMatch}
                    />
                );
            case 'control':
                 if (!activeMatch) return <div>Cargando...</div>;
                return (
                    <MatchControl
                        match={activeMatch}
                        onMatchChange={handleUpdateMatch}
                        onBackToDashboard={handleBackToDashboard}
                    />
                );
            default:
                return null;
        }
    }

    return (
        <div className="container mx-auto p-2 sm:p-4">
            <main>
                {renderContent()}
            </main>
            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, matchId: null, callback: undefined })}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message="¿Seguro que quieres eliminar este partido? Esta acción no se puede deshacer."
            />
        </div>
    );
};

export default App;