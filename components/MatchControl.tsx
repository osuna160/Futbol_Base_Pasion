import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Player, Team, TeamId, SubstitutionContext, PlayerStatKeys, StatEvent, SubstitutionEvent, Match, GoalEvent, GoalType, MatchEvent, MediaItem } from '../types';
import { MatchState } from '../types';
import { getFormationData } from '../constants';
import Header from './Header';
import TeamPanel from './TeamPanel';
import SubstitutionModal from './SubstitutionModal';
import Formations from './Formations';
import SubstitutionLog from './SubstitutionLog';
import GoalTypeModal from './GoalTypeModal';
import EventLog from './EventLog';
import { TrashIcon } from './icons';

interface MatchControlProps {
    match: Match;
    onMatchChange: (updatedMatch: Match) => void;
    onBackToDashboard: () => void;
}

const MediaManager: React.FC<{ media: MediaItem[], onMediaChange: (newMedia: MediaItem[]) => void }> = ({ media, onMediaChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newMediaItem: MediaItem = {
                    id: `${Date.now()}-${file.name}`,
                    type: file.type,
                    dataUrl: e.target?.result as string,
                    name: file.name
                };
                onMediaChange([...media, newMediaItem]);
            };
            reader.readAsDataURL(file);
        });
        
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = (id: string) => {
        onMediaChange(media.filter(item => item.id !== id));
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Multimedia del Partido</h3>
            <div className="media-gallery mb-4">
                {media.map(item => (
                    <div key={item.id} className="media-thumbnail">
                        {item.type.startsWith('image/') && <img src={item.dataUrl} alt={item.name} />}
                        {item.type.startsWith('video/') && <video src={item.dataUrl} controls />}
                        <div className="overlay truncate">{item.name}</div>
                        <button onClick={() => handleDelete(item.id)} className="delete-btn" title="Eliminar">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <input
                type="file"
                multiple
                accept="image/*,video/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
                + Añadir Fotos o Vídeos
            </button>
        </div>
    );
};

const MatchControl: React.FC<MatchControlProps> = ({ match, onMatchChange, onBackToDashboard }) => {
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [substitutionContext, setSubstitutionContext] = useState<SubstitutionContext>({ teamId: null });
  const [goalTypeModalContext, setGoalTypeModalContext] = useState<{ teamId: TeamId; playerId: number } | null>(null);
  
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const saveIndicatorTimeoutRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'formations' | 'media'>('teams');

  const updateMatch = useCallback((updateFn: (draft: Match) => void) => {
    const draft = JSON.parse(JSON.stringify(match));
    updateFn(draft);
    onMatchChange(draft);
  }, [match, onMatchChange]);

  useEffect(() => {
    setShowSaveIndicator(true);
    if (saveIndicatorTimeoutRef.current) clearTimeout(saveIndicatorTimeoutRef.current);
    saveIndicatorTimeoutRef.current = window.setTimeout(() => setShowSaveIndicator(false), 1500);
    return () => { if (saveIndicatorTimeoutRef.current) clearTimeout(saveIndicatorTimeoutRef.current); };
  }, [match]);
  
  const getCurrentMinute = useCallback(() => Math.floor(match.totalSeconds / 60) + 1, [match.totalSeconds]);

  const updateTeam = (teamId: TeamId, updateFn: (team: Team) => void) => {
    updateMatch(draft => {
        const teamToUpdate = teamId === 'a' ? draft.teamA : draft.teamB;
        if (teamToUpdate) {
            updateFn(teamToUpdate);
        }
    });
  };
  
  const handleUpdateTeamName = (teamId: TeamId, name: string) => updateTeam(teamId, (team) => { team.name = name; });

  const handleUpdateTeamLogo = (teamId: TeamId, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) updateTeam(teamId, (team) => { team.logo = dataUrl; });
    };
    reader.readAsDataURL(file);
  };

  const handleUpdatePlayer = (teamId: TeamId, playerId: number, field: 'name' | 'number', value: string) => {
    updateTeam(teamId, (team) => {
      const updatePlayerList = (players: Player[]) => players.map(p => 
          p.id === playerId ? { ...p, [field]: field === 'number' ? parseInt(value, 10) || 0 : value } : p
      );
      team.starters = updatePlayerList(team.starters);
      team.subs = updatePlayerList(team.subs);
    });
  };

  const handleAddGoal = (teamId: TeamId, playerId: number) => {
    if (isMatchActionEnabled) setGoalTypeModalContext({ teamId, playerId });
  };

  const handleConfirmGoalType = (goalType: GoalType) => {
    if (!goalTypeModalContext) return;
    const { teamId, playerId } = goalTypeModalContext;
    const minute = getCurrentMinute();
    
    updateTeam(teamId, (team) => {
        const updatePlayerList = (players: Player[]) => players.map(p => 
            p.id === playerId ? { ...p, goals: [...p.goals, { minute, type: goalType }] } : p
        );
        team.starters = updatePlayerList(team.starters);
        team.subs = updatePlayerList(team.subs);
        team.score += 1;
    });
    setGoalTypeModalContext(null);
  };

  const handleUpdatePlayerStat = (teamId: TeamId, playerId: number, stat: PlayerStatKeys, action: 'add' | 'remove') => {
      const minute = getCurrentMinute();
      updateTeam(teamId, (team) => {
          let scoreChange = 0;
          const updatePlayerList = (players: Player[]) => players.map(p => {
              if (p.id !== playerId || (stat === 'goals' && action === 'add')) return p;
              
              const currentStat = p[stat] as StatEvent[];
              const updatedStat = action === 'add' ? [...currentStat, { minute }] : currentStat.slice(0, -1);

              if (stat === 'goals' && action === 'remove' && currentStat.length > 0) scoreChange = -1;
              
              return { ...p, [stat]: updatedStat };
          });
          team.starters = updatePlayerList(team.starters);
          team.subs = updatePlayerList(team.subs);
          team.score += scoreChange;
      });
  };

  const handleGiveCard = (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => {
      const minute = getCurrentMinute();
      updateTeam(teamId, team => {
          const updatePlayer = (p: Player): Player => {
              if (p.id !== playerId || p.isSentOff) return p;
              if (cardType === 'yellow') {
                  const newYellows = [...p.yellowCards, { minute }];
                  return newYellows.length === 2 ? { ...p, yellowCards: newYellows, redCard: { minute }, isSentOff: true } : { ...p, yellowCards: newYellows };
              }
              return { ...p, redCard: { minute }, isSentOff: true };
          };
          team.starters = team.starters.map(updatePlayer);
          team.subs = team.subs.map(updatePlayer);
      });
  };

  const handleRemoveCard = (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => {
      updateTeam(teamId, team => {
          const updatePlayer = (p: Player): Player => {
              if (p.id !== playerId) return p;
              if (cardType === 'red') {
                  const wasSecondYellow = p.yellowCards.length === 2 && p.redCard?.minute === p.yellowCards[1]?.minute;
                  return { ...p, redCard: null, isSentOff: false, yellowCards: wasSecondYellow ? p.yellowCards.slice(0, 1) : p.yellowCards };
              }
              return p.yellowCards.length > 0 ? { ...p, yellowCards: p.yellowCards.slice(0, -1) } : p;
          };
          team.starters = team.starters.map(updatePlayer);
          team.subs = team.subs.map(updatePlayer);
      });
  };

  const handleTeamStatChange = (teamId: TeamId, stat: 'cornersFor', action: 'add' | 'remove') => {
    const minute = getCurrentMinute();
    updateTeam(teamId, (team) => {
        const currentStat = team[stat];
        const newStat = action === 'add' ? [...currentStat, { minute }] : currentStat.slice(0, -1);
        team[stat] = newStat;
    });
  };
  
  useEffect(() => {
    if (isRunning && (match.matchState === MatchState.FIRST_HALF || match.matchState === MatchState.SECOND_HALF)) {
        timerRef.current = window.setInterval(() => updateMatch(draft => { draft.totalSeconds += 1; }), 1000);
    } else if (timerRef.current) {
        clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, match.matchState, updateMatch]);

  const handleStartPause = () => {
    if (match.matchState === MatchState.FIRST_HALF || match.matchState === MatchState.SECOND_HALF) {
        setIsRunning(prev => !prev);
    } else if (match.matchState === MatchState.NOT_STARTED) {
        updateMatch(draft => {
            draft.matchState = MatchState.FIRST_HALF;
            draft.details.matchTime = draft.details.matchTime || new Date().toISOString();
            if (draft.teamA && draft.initialStartersA.length === 0) draft.initialStartersA = JSON.parse(JSON.stringify(draft.teamA.starters));
            if (draft.teamB && draft.initialStartersB.length === 0) draft.initialStartersB = JSON.parse(JSON.stringify(draft.teamB.starters));
        });
        setIsRunning(true);
    } else if (match.matchState === MatchState.HALF_TIME) {
        updateMatch(draft => {
            draft.matchState = MatchState.SECOND_HALF;
        });
        setIsRunning(true);
    }
  };

  useEffect(() => {
    if (match.matchState === MatchState.FIRST_HALF && match.totalSeconds >= match.halfDurationMinutes * 60) {
        setIsRunning(false);
        updateMatch(draft => { draft.matchState = MatchState.HALF_TIME; });
    } else if (match.matchState === MatchState.SECOND_HALF && match.totalSeconds >= match.halfDurationMinutes * 2 * 60) {
        setIsRunning(false);
        updateMatch(draft => { draft.matchState = MatchState.FULL_TIME; });
    }
  }, [match.totalSeconds, match.halfDurationMinutes, match.matchState, updateMatch]);

  const handleMinuteChange = (minutes: number) => {
      updateMatch(draft => {
        const newTotalSeconds = minutes * 60;
        if (draft.matchState === MatchState.FIRST_HALF) {
            draft.totalSeconds = Math.min(newTotalSeconds, draft.halfDurationMinutes * 60);
        } else if (draft.matchState === MatchState.SECOND_HALF) {
            draft.totalSeconds = Math.max(draft.halfDurationMinutes * 60, Math.min(newTotalSeconds, draft.halfDurationMinutes * 2 * 60));
        } else {
            draft.totalSeconds = newTotalSeconds;
        }
      });
  };

  const handleHalfDurationChange = (minutes: number) => {
    if (match.matchState === MatchState.NOT_STARTED) {
      updateMatch(draft => { draft.halfDurationMinutes = minutes; });
    }
  };
  
  const handleResetHalf = () => updateMatch(draft => {
      if (draft.matchState === MatchState.FIRST_HALF) draft.totalSeconds = 0;
      else if (draft.matchState === MatchState.SECOND_HALF) draft.totalSeconds = draft.halfDurationMinutes * 60;
  });

  const handleEndMatch = () => {
      setIsRunning(false);
      updateMatch(draft => { draft.matchState = MatchState.FULL_TIME; });
  };
  
  const handleInitiateSub = (teamId: TeamId) => {
    setSubstitutionContext({ teamId });
    setIsSubModalOpen(true);
  };

  const handleConfirmSubstitutions = (subsToMake: { playerOutId: number, playerInId: number }[]) => {
      const { teamId } = substitutionContext;
      if (!teamId) return;
      const minute = getCurrentMinute();
      updateMatch(draft => {
        const team = teamId === 'a' ? draft.teamA : draft.teamB;
        if (!team) return;

        subsToMake.forEach(({ playerOutId, playerInId }) => {
            const playerOutIndex = team.starters.findIndex(p => p.id === playerOutId);
            const playerInIndex = team.subs.findIndex(p => p.id === playerInId);
            if (playerOutIndex === -1 || playerInIndex === -1) return;

            const pOutOriginal = team.starters[playerOutIndex];
            const pInOriginal = team.subs[playerInIndex];
            
            const pOutNew = { ...pOutOriginal, isOnField: false, position: {x: -1, y: -1}, positionName: 'Suplente', positionAbbr: 'SUP' };
            const pInNew = { ...pInOriginal, isOnField: true, position: pOutOriginal.position, positionName: pOutOriginal.positionName, positionAbbr: pOutOriginal.positionAbbr };

            team.starters[playerOutIndex] = pInNew;
            team.subs[playerInIndex] = pOutNew;
            
            draft.substitutionLog.push({ teamId, minute, playerOut: {id: pOutOriginal.id, name: pOutOriginal.name, number: pOutOriginal.number}, playerIn: {id: pInOriginal.id, name: pInOriginal.name, number: pInOriginal.number} });
        });
        if (draft.details.matchType === 'Liga' && draft.matchState !== MatchState.HALF_TIME) {
            team.substitutionWindows = Math.max(0, team.substitutionWindows - 1);
        }
      });
      setIsSubModalOpen(false);
  };
  
  const handlePlayerMove = (teamId: TeamId, playerId: number, position: { x: number; y: number }) => {
    updateTeam(teamId, team => {
      team.starters = team.starters.map(p => p.id === playerId ? { ...p, position } : p);
    });
  };

  const handleFormationChange = (teamId: TeamId, formation: string) => {
    updateTeam(teamId, team => {
        const formationData = getFormationData(formation);
        team.formation = formation;
        team.starters = team.starters.map((player, index) => ({
            ...player,
            position: formationData[index].pos,
            positionName: formationData[index].name,
            positionAbbr: formationData[index].abbr,
        }));
    });
  };

  const matchEvents = useMemo(() => {
    const { teamA, teamB, substitutionLog } = match;
    if (!teamA || !teamB) return [];

    const processTeam = (team: Team, id: TeamId): MatchEvent[] => {
        const players = [...team.starters, ...team.subs];
        return players.flatMap(p => [
            ...p.goals.map((g): MatchEvent => ({ minute: g.minute, teamId: id, teamName: team.name, type: 'GOAL', detail: `Gol de ${p.name} (#${p.number})` })),
            ...p.yellowCards.map((yc): MatchEvent => ({ minute: yc.minute, teamId: id, teamName: team.name, type: 'YELLOW_CARD', detail: `Tarjeta amarilla para ${p.name} (#${p.number})` })),
            ...(p.redCard ? [{ minute: p.redCard.minute, teamId: id, teamName: team.name, type: 'RED_CARD', detail: `Tarjeta roja para ${p.name} (#${p.number})` } as MatchEvent] : []),
        ]);
    };

    const teamAEvents = processTeam(teamA, 'a');
    const teamBEvents = processTeam(teamB, 'b');

    const subEvents: MatchEvent[] = substitutionLog.map(s => ({
        minute: s.minute,
        teamId: s.teamId,
        teamName: s.teamId === 'a' ? teamA.name : teamB.name,
        type: 'SUBSTITUTION',
        detail: `Sale ${s.playerOut.name} / Entra ${s.playerIn.name}`,
        playerOut: s.playerOut,
        playerIn: s.playerIn,
    }));

    const allEvents = [...teamAEvents, ...teamBEvents, ...subEvents];
    return allEvents.sort((a, b) => a.minute - b.minute);
}, [match]);

  const isRosterEditable = true; // Always allow editing names/numbers
  const isMatchActionEnabled = match.matchState !== MatchState.NOT_STARTED;
  
  const { teamA, teamB } = match;
  if (!teamA || !teamB) return <div className="text-center p-8">Iniciando partido...</div>;

  return (
    <>
      <Header
        matchState={match.matchState} totalSeconds={match.totalSeconds} isRunning={isRunning} halfDurationMinutes={match.halfDurationMinutes}
        teamA={teamA} teamB={teamB} onStartPause={handleStartPause} onMinuteChange={handleMinuteChange}
        onHalfDurationChange={handleHalfDurationChange} onResetHalf={handleResetHalf}
        onEndMatch={handleEndMatch} onBackToDashboard={onBackToDashboard} showSaveIndicator={showSaveIndicator}
      />
      
      <div className="bg-gray-800 rounded-lg shadow-lg mb-6">
        <div className="flex border-b border-gray-700">
            <button onClick={() => setActiveTab('teams')} className={`tab-nav-button ${activeTab === 'teams' ? 'active' : ''}`}>Equipos</button>
            <button onClick={() => setActiveTab('formations')} className={`tab-nav-button ${activeTab === 'formations' ? 'active' : ''}`}>Pizarra Táctica</button>
            <button onClick={() => setActiveTab('media')} className={`tab-nav-button ${activeTab === 'media' ? 'active' : ''}`}>Multimedia</button>
        </div>
      </div>
      
      {activeTab === 'formations' && <Formations teamA={teamA} teamB={teamB} onPlayerMove={handlePlayerMove} onFormationChange={handleFormationChange} />}
      {activeTab === 'media' && <MediaManager media={match.media} onMediaChange={(newMedia) => updateMatch(draft => { draft.media = newMedia; })} />}

      <EventLog events={matchEvents} teamA={teamA} teamB={teamB} />
      <SubstitutionLog substitutionLog={match.substitutionLog} teamA={teamA} teamB={teamB} />

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <TeamPanel team={teamA} opponentTeam={teamB} teamId="a" matchState={match.matchState} isRosterEditable={isRosterEditable} isMatchActionEnabled={isMatchActionEnabled} onUpdateTeamName={handleUpdateTeamName} onUpdateTeamLogo={handleUpdateTeamLogo} onUpdatePlayer={handleUpdatePlayer} onGiveCard={handleGiveCard} onRemoveCard={handleRemoveCard} onInitiateSub={handleInitiateSub} onUpdatePlayerStat={handleUpdatePlayerStat} onAddGoal={handleAddGoal} onTeamStatChange={handleTeamStatChange} />
            <TeamPanel team={teamB} opponentTeam={teamA} teamId="b" matchState={match.matchState} isRosterEditable={isRosterEditable} isMatchActionEnabled={isMatchActionEnabled} onUpdateTeamName={handleUpdateTeamName} onUpdateTeamLogo={handleUpdateTeamLogo} onUpdatePlayer={handleUpdatePlayer} onGiveCard={handleGiveCard} onRemoveCard={handleRemoveCard} onInitiateSub={handleInitiateSub} onUpdatePlayerStat={handleUpdatePlayerStat} onAddGoal={handleAddGoal} onTeamStatChange={handleTeamStatChange} />
        </div>
      )}

      {isSubModalOpen && <SubstitutionModal isOpen={isSubModalOpen} team={substitutionContext.teamId === 'a' ? teamA : teamB} onClose={() => setIsSubModalOpen(false)} onConfirm={handleConfirmSubstitutions} />}
      {goalTypeModalContext && <GoalTypeModal isOpen={!!goalTypeModalContext} onClose={() => setGoalTypeModalContext(null)} onConfirm={handleConfirmGoalType} />}
    </>
  );
};

export default MatchControl;