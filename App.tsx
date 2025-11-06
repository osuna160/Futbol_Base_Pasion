
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Match, Team, Player, StarterSetup, SubSetup, RosterPlayer, TrainingSession, TeamSetup, MatchDetails, TeamSettings, UnavailabilityReason, UnavailableSetup, OpponentTeam } from './types';
import { MatchState } from './types';
import { getInitialTeamSetup, getInitialMatchDetails, getFormationData, MY_TEAM_NAME, getInitialMyTeamSetup } from './constants';
import Setup from './components/Setup';
import MatchControl from './components/MatchControl';
import Dashboard from './components/Dashboard';
import TeamRoster from './components/TeamRoster';
import TrainingDashboard from './components/TrainingDashboard';
import ConfirmationModal from './components/ConfirmationModal';
import MediaGallery from './components/MediaGallery';
import type { MediaItem } from './types';
import { runMigrations, DATA_VERSION } from './migrations';


// Make jsPDF available from CDN
declare const jspdf: any;
declare const XLSX: any;

const APP_STORAGE_KEY = 'futbolControlEstadisticoApp';

const initialState = (() => {
    const defaultState = {
        matches: [],
        myTeamRoster: [],
        trainingSessions: {},
        mediaGallery: [],
        teamSettings: { primaryColor: '#06b6d4', secondaryColor: '#67e8f9' },
        opponentTeams: [],
    };
    try {
        const serializedState = localStorage.getItem(APP_STORAGE_KEY);
        if (serializedState === null) {
            return defaultState;
        }
        
        const loadedData = JSON.parse(serializedState);
        const migratedState = runMigrations(loadedData);

        // Final validation to ensure the state is well-formed
        return {
            matches: Array.isArray(migratedState.matches) ? migratedState.matches : [],
            myTeamRoster: Array.isArray(migratedState.myTeamRoster) ? migratedState.myTeamRoster : [],
            trainingSessions: typeof migratedState.trainingSessions === 'object' && migratedState.trainingSessions !== null ? migratedState.trainingSessions : {},
            mediaGallery: Array.isArray(migratedState.mediaGallery) ? migratedState.mediaGallery : [],
            teamSettings: typeof migratedState.teamSettings === 'object' && migratedState.teamSettings !== null ? migratedState.teamSettings : defaultState.teamSettings,
            opponentTeams: Array.isArray(migratedState.opponentTeams) ? migratedState.opponentTeams : [],
        };
    } catch (err) {
        console.error("Could not load and migrate state from localStorage", err);
        return defaultState;
    }
})();


const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'dashboard' | 'setup' | 'control' | 'roster' | 'training' | 'media'>('dashboard');
    const [matches, setMatches] = useState<Match[]>(initialState.matches);
    const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
    const [myTeamRoster, setMyTeamRoster] = useState<RosterPlayer[]>(initialState.myTeamRoster);
    const [trainingSessions, setTrainingSessions] = useState<Record<string, TrainingSession[]>>(initialState.trainingSessions);
    const [mediaGallery, setMediaGallery] = useState<MediaItem[]>(initialState.mediaGallery);
    const [teamSettings, setTeamSettings] = useState<TeamSettings>(initialState.teamSettings);
    const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>(initialState.opponentTeams);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        matchId: number | null;
        callback?: () => void;
    }>({ isOpen: false, matchId: null });

    // Apply team colors as CSS variables
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', teamSettings.primaryColor);
        root.style.setProperty('--secondary-color', teamSettings.secondaryColor);
    }, [teamSettings]);


    // Save state to localStorage whenever it changes
    useEffect(() => {
        try {
            const dataToSave = {
                matches,
                myTeamRoster,
                trainingSessions,
                mediaGallery,
                teamSettings,
                opponentTeams,
            };
            const stateToSave = {
                version: DATA_VERSION,
                data: dataToSave,
            };
            const serializedState = JSON.stringify(stateToSave);
            localStorage.setItem(APP_STORAGE_KEY, serializedState);
        } catch (err) {
            console.error("Could not save state to localStorage", err);
        }
    }, [matches, myTeamRoster, trainingSessions, mediaGallery, teamSettings, opponentTeams]);

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

        const updatedMatch = JSON.parse(JSON.stringify(matchToStart));
        let matchRequiresUpdate = false;

        if (updatedMatch.matchState === MatchState.NOT_STARTED) {
            matchRequiresUpdate = true;
            
            const myTeamStarterIds = new Set(updatedMatch.myTeamSetup.starters.map((s: StarterSetup) => s.playerId).filter(Boolean));
            const myTeamUnavailableIds = new Set(updatedMatch.myTeamSetup.unavailable.map((u: UnavailableSetup) => u.id));

            const actualMyTeamSubsFromRoster = myTeamRoster.filter(p => 
                p.availability?.status !== 'No Disponible' &&
                !myTeamStarterIds.has(p.id) && 
                !myTeamUnavailableIds.has(p.id)
            );
            
            updatedMatch.myTeamSetup.subs = actualMyTeamSubsFromRoster.map((p: RosterPlayer): SubSetup => ({
                id: p.id,
                playerName: p.name,
                playerNumber: p.number,
            }));

            const opponentStarterIds = new Set(updatedMatch.opponentTeamSetup.starters.map((s: StarterSetup) => s.playerId).filter(Boolean));
            
            const opponentTeamFromDb = updatedMatch.opponentTeamId ? opponentTeams.find(t => t.id === updatedMatch.opponentTeamId) : null;
            if (opponentTeamFromDb) {
                 updatedMatch.opponentTeamSetup.subs = opponentTeamFromDb.players
                    .filter(p => !opponentStarterIds.has(p.id))
                    .map(p => ({ id: p.id, playerName: p.name, playerNumber: p.number }));
            }


            updatedMatch.matchState = MatchState.FIRST_HALF;
            updatedMatch.details.matchTime = updatedMatch.details.matchTime || new Date().toISOString();

            const createPlayer = (
                playerData: { playerName: string, playerNumber: number, playerId?: number | null, id?: number },
                id: number,
                isOnField: boolean,
                positionInfo: { pos: { x: number; y: number }; name: string; abbr: string },
                unavailabilityReason?: UnavailabilityReason
            ): Player => {
                const rosterPlayer = myTeamRoster.find(p => p.id === id);
                return {
                    id, name: playerData.playerName, number: playerData.playerNumber,
                    photoId: rosterPlayer?.photoId,
                    positionName: positionInfo.name, positionAbbr: positionInfo.abbr,
                    yellowCards: [], redCard: null, isSentOff: false, isOnField,
                    isGoalkeeper: positionInfo.name === 'Portera',
                    position: positionInfo.pos,
                    unavailabilityReason,
                    goals: [], goalChances: [], penaltiesCommitted: [], penaltiesMissed: [], offsidesCommitted: [],
                    goalsConceded: [], saves: [], penaltiesSaved: [],
                };
            };
            
            const createTeamFromSetup = (
                teamSetup: TeamSetup, teamName: string, logo: string | undefined, baseId: number
            ): Team => {
                const formationData = getFormationData(teamSetup.formation);

                const starters = teamSetup.starters
                    .map((starter, index) => {
                        if (!starter.playerName || !starter.playerNumber) return null;
                        return createPlayer(starter, starter.playerId || (baseId + index), true, formationData[index]);
                    })
                    .filter((p): p is Player => p !== null);

                const starterIds = new Set(starters.map(s => s.id));

                const subs = teamSetup.subs
                    .filter(s => s.playerName && s.playerNumber > 0 && !starterIds.has(s.id))
                    .map((s, i) => createPlayer(s, s.id || (baseId + 100 + i), false, { pos: { x: -20, y: -20 }, name: 'Suplente', abbr: 'SUP'}));

                const unavailable = teamSetup.unavailable
                    .map((u, i) => createPlayer(u, u.id || (baseId + 200 + i), false, { pos: {x: -1, y: -1}, name: 'No Disponible', abbr: 'N/D' }, u.reason));

                return {
                    name: teamName, score: 0, logo, starters, subs, unavailable,
                    formation: teamSetup.formation, cornersFor: [], foulsCommitted: [],
                    substitutionWindows: updatedMatch.details.matchType === 'Liga' ? 3 : 99,
                };
            };
            
            const myTeam = createTeamFromSetup(updatedMatch.myTeamSetup, MY_TEAM_NAME, updatedMatch.details.myTeamLogo, 100);
            const opponentTeam = createTeamFromSetup(updatedMatch.opponentTeamSetup, updatedMatch.details.opponentName, updatedMatch.details.opponentLogo, 200);

            if (updatedMatch.details.myTeamLocation === 'home') {
                updatedMatch.teamA = myTeam;
                updatedMatch.teamB = opponentTeam;
            } else {
                updatedMatch.teamA = opponentTeam;
                updatedMatch.teamB = myTeam;
            }
            
            if (updatedMatch.teamA) {
                updatedMatch.initialStartersA = JSON.parse(JSON.stringify(updatedMatch.teamA.starters));
            }
            if (updatedMatch.teamB) {
                updatedMatch.initialStartersB = JSON.parse(JSON.stringify(updatedMatch.teamB.starters));
            }
        } else if (updatedMatch.teamA && updatedMatch.teamB) {
            matchRequiresUpdate = true;
            
            const syncTeam = (liveTeam: Team, setup: TeamSetup) => {
                const setupPlayers = [...setup.starters, ...setup.subs];
        
                const syncPlayerList = (list: Player[]) => {
                    list.forEach(livePlayer => {
                        const setupPlayer = setupPlayers.find(sp => {
                            const spId = 'playerId' in sp ? sp.playerId : sp.id;
                            return spId === livePlayer.id;
                        });
        
                        if(setupPlayer) {
                            livePlayer.name = setupPlayer.playerName;
                            livePlayer.number = setupPlayer.playerNumber;
                        }
                    });
                };
        
                syncPlayerList(liveTeam.starters);
                syncPlayerList(liveTeam.subs);
            };
        
            const myTeamIsA = updatedMatch.details.myTeamLocation === 'home';
            const myTeamSetup = updatedMatch.myTeamSetup;
            const opponentTeamSetup = updatedMatch.opponentTeamSetup;
        
            if (myTeamIsA) {
                syncTeam(updatedMatch.teamA, myTeamSetup);
                syncTeam(updatedMatch.teamB, opponentTeamSetup);
            } else {
                syncTeam(updatedMatch.teamB, myTeamSetup);
                syncTeam(updatedMatch.teamA, opponentTeamSetup);
            }
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
    
    const handleImportRoster = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length > 0) {
                    const findHeader = (row: any, potentialNames: string[]): any | undefined => {
                        const rowKeys = Object.keys(row);
                        for (const name of potentialNames) {
                            const foundKey = rowKeys.find(key => key.toLowerCase().trim() === name.toLowerCase());
                            if (foundKey) return row[foundKey];
                        }
                        return undefined;
                    };
                    
                    const newRoster: RosterPlayer[] = json.map((row, index): RosterPlayer | null => {
                        const name = findHeader(row, ['nombre', 'jugadora', 'name']);
                        const numberStr = findHeader(row, ['dorsal', 'numero', 'número', '#', 'number']);
                        
                        if (!name || !numberStr) return null; // Skip invalid rows

                        const number = parseInt(String(numberStr), 10);
                        
                        let dateOfBirth: string | undefined = undefined;
                        const dobValue = findHeader(row, ['fecha de nacimiento', 'nacimiento', 'fecha', 'dob']);
                        if (dobValue) {
                            if (typeof dobValue === 'number') { // Excel date serial number
                                const excelEpoch = new Date(1899, 11, 30);
                                const jsDate = new Date(excelEpoch.getTime() + dobValue * 86400000);
                                dateOfBirth = jsDate.toISOString().split('T')[0];
                            } else if (typeof dobValue === 'string') { // Date string
                                const parsedDate = new Date(dobValue);
                                if (!isNaN(parsedDate.getTime())) {
                                    dateOfBirth = parsedDate.toISOString().split('T')[0];
                                }
                            }
                        }

                        return {
                            id: Date.now() + index,
                            name: String(name),
                            number: isNaN(number) ? 0 : number,
                            dateOfBirth,
                            availability: { status: 'Disponible', reason: 'Lesión' }
                        };
                    }).filter((p: RosterPlayer | null): p is RosterPlayer => p !== null && p.name && p.number > 0);

                    if (newRoster.length > 0) {
                        setMyTeamRoster(newRoster);
                        alert(`${newRoster.length} jugadoras importadas correctamente.`);
                    } else {
                         alert("No se encontraron jugadoras válidas en el archivo. Asegúrate de que las columnas 'Nombre' y 'Dorsal' existan y tengan datos.");
                    }
                } else {
                    alert('El archivo Excel está vacío.');
                }
            } catch (error) {
                console.error("Error al importar el archivo Excel:", error);
                alert("Hubo un error al procesar el archivo. Asegúrate de que es un archivo .xlsx válido.");
            }
        };
        reader.onerror = (err) => {
            console.error("Error al leer el archivo:", err);
            alert("No se pudo leer el archivo.");
        };
        reader.readAsArrayBuffer(file);
    };


    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <Dashboard
                        matches={matches}
                        roster={myTeamRoster}
                        sessions={trainingSessions}
                        teamSettings={teamSettings}
                        opponentTeams={opponentTeams}
                        onOpponentTeamsChange={setOpponentTeams}
                        onNewMatch={() => handleGoToSetup()}
                        onGoToRoster={() => setCurrentView('roster')}
                        onGoToTraining={() => setCurrentView('training')}
                        onGoToMedia={() => setCurrentView('media')}
                        onStartOrResumeMatch={handleStartOrResumeMatch}
                        onEditMatch={(id) => handleGoToSetup(id)}
                        onDeleteMatch={handleDeleteMatch}
                    />
                );
            case 'roster':
                return (
                    <TeamRoster
                        roster={myTeamRoster}
                        matches={matches}
                        teamSettings={teamSettings}
                        onRosterChange={setMyTeamRoster}
                        onTeamSettingsChange={setTeamSettings}
                        onBack={handleBackToDashboard}
                        onImportRoster={handleImportRoster}
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
            case 'media':
                 return (
                    <MediaGallery
                        mediaItems={mediaGallery}
                        onMediaItemsChange={setMediaGallery}
                        onBack={handleBackToDashboard}
                    />
                );
            case 'setup':
                if (!activeMatch) return <div>Cargando...</div>;
                return (
                    <Setup
                        match={activeMatch}
                        roster={myTeamRoster}
                        opponentTeams={opponentTeams}
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
