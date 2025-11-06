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
import { addMedia, getMedia, deleteMedia } from './db';
import LiveModeOverlay from './LiveModeOverlay';
import EditEventModal from './EditEventModal';

interface MatchControlProps {
    match: Match;
    onMatchChange: (updatedMatch: Match) => void;
    onBackToDashboard: () => void;
}

const generateEventId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const MediaManager: React.FC<{ media: MediaItem[], onMediaChange: (newMedia: MediaItem[]) => void }> = ({ media, onMediaChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mediaSources, setMediaSources] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadSources = async () => {
            const sources: Record<string, string> = {};
            for (const item of media) {
                if (item.storage === 'indexeddb') {
                    const blob = await getMedia(item.id);
                    if (blob) {
                        sources[item.id] = URL.createObjectURL(blob);
                    }
                } else {
                    sources[item.id] = item.dataUrl;
                }
            }
            setMediaSources(sources);
        };
        loadSources();

        return () => {
            Object.values(mediaSources).forEach(url => {
                if(typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [media]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        
        const newMediaItems: MediaItem[] = [];
        for (const file of files) {
            if (file instanceof File) {
                const id = `${Date.now()}-${file.name}`;
                await addMedia(id, file);
                newMediaItems.push({
                    id,
                    type: file.type,
                    name: file.name,
                    storage: 'indexeddb',
                    dataUrl: '' // Placeholder, will be loaded from DB
                });
            }
        }
        
        onMediaChange([...media, ...newMediaItems]);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = async (id: string) => {
        await deleteMedia(id);
        onMediaChange(media.filter(item => item.id !== id));
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
            <div className="media-gallery mb-4">
                {media.map(item => (
                    <div key={item.id} className="media-thumbnail">
                        {mediaSources[item.id] && item.type.startsWith('image/') && <img src={mediaSources[item.id]} alt={item.name} />}
                        {mediaSources[item.id] && item.type.startsWith('video/') && <video src={mediaSources[item.id]} controls />}
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
  const [isLiveModeActive, setIsLiveModeActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'pizarra' | 'multimedia'>('pizarra');
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);

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
            p.id === playerId ? { ...p, goals: [...p.goals, { id: generateEventId(), minute, type: goalType }] } : p
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
              const updatedStat = action === 'add' ? [...currentStat, { id: generateEventId(), minute }] : currentStat.slice(0, -1);

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
                  const newYellows = [...p.yellowCards, { id: generateEventId(), minute }];
                  return newYellows.length === 2 ? { ...p, yellowCards: newYellows, redCard: { id: generateEventId(), minute }, isSentOff: true } : { ...p, yellowCards: newYellows };
              }
              return { ...p, redCard: { id: generateEventId(), minute }, isSentOff: true };
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
                  if (!p.redCard) return p;

                  if (p.yellowCards.length === 2) {
                      return {
                          ...p,
                          yellowCards: p.yellowCards.slice(0, 1),
                          redCard: null,
                          isSentOff: false,
                      };
                  } else {
                      return {
                          ...p,
                          redCard: null,
                          isSentOff: false,
                      };
                  }
              }

              if (cardType === 'yellow') {
                  if (p.yellowCards.length === 0) return p;

                  const hadTwoYellows = p.yellowCards.length === 2 && p.redCard;
                  const newYellows = p.yellowCards.slice(0, -1);

                  if (hadTwoYellows) {
                      return {
                          ...p,
                          yellowCards: newYellows,
                          redCard: null,
                          isSentOff: false,
                      };
                  } else {
                      return { ...p, yellowCards: newYellows };
                  }
              }
              
              return p;
          };
          team.starters = team.starters.map(updatePlayer);
          team.subs = team.subs.map(updatePlayer);
      });
  };

  const handleTeamStatChange = (teamId: TeamId, stat: 'cornersFor' | 'foulsCommitted', action: 'add' | 'remove') => {
    const minute = getCurrentMinute();
    updateTeam(teamId, (team) => {
        const currentStat = team[stat];
        const newStat = action === 'add' ? [...currentStat, { id: generateEventId(), minute }] : currentStat.slice(0, -1);
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

        const playersOutOriginals: Player[] = [];
        const playersInOriginals: Player[] = [];
        
        subsToMake.forEach(({ playerOutId, playerInId }) => {
          const pOut = team.starters.find(p => p.id === playerOutId);
          const pIn = team.subs.find(p => p.id === playerInId);
          if (pOut && pIn) {
              playersOutOriginals.push(JSON.parse(JSON.stringify(pOut)));
              playersInOriginals.push(JSON.parse(JSON.stringify(pIn)));
          }
        });
        
        const playersOutIds = new Set(playersOutOriginals.map(p => p.id));
        const playersInIds = new Set(playersInOriginals.map(p => p.id));
  
        const playersToAddToSubs = playersOutOriginals.map(pOut => ({
          ...pOut, 
          isOnField: false, 
          position: {x: -1, y: -1}, 
          positionName: 'Suplente', 
          positionAbbr: 'SUP' 
        }));
  
        const playersToAddToStarters = playersInOriginals.map(pIn => {
          const subPair = subsToMake.find(s => s.playerInId === pIn.id)!;
          const correspondingPlayerOut = playersOutOriginals.find(p => p.id === subPair.playerOutId)!;
          return {
            ...pIn,
            isOnField: true,
            position: correspondingPlayerOut.position,
            positionName: correspondingPlayerOut.positionName,
            positionAbbr: correspondingPlayerOut.positionAbbr
          };
        });
  
        team.starters = [...team.starters.filter(p => !playersOutIds.has(p.id)), ...playersToAddToStarters];
        team.subs = [...team.subs.filter(p => !playersInIds.has(p.id)), ...playersToAddToSubs];
  
        subsToMake.forEach(({ playerOutId, playerInId }) => {
          const pOut = playersOutOriginals.find(p => p.id === playerOutId)!;
          const pIn = playersInOriginals.find(p => p.id === playerInId)!;
          draft.substitutionLog.push({ 
            id: generateEventId(),
            teamId, 
            minute, 
            playerOut: { id: pOut.id, name: pOut.name, number: pOut.number }, 
            playerIn: { id: pIn.id, name: pIn.name, number: pIn.number } 
          });
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

  const handleEditEvent = (event: MatchEvent) => {
    setEditingEvent(event);
  };

  const handleDeleteEvent = (eventToDelete: MatchEvent) => {
    const confirmed = window.confirm(
        `¿Estás seguro de que quieres eliminar este evento?\n\n"${eventToDelete.detail}" (min ${eventToDelete.minute}')\n\nEsta acción revertirá las estadísticas asociadas.`
    );

    if (!confirmed) {
        return;
    }

    updateMatch(draft => {
        const { id: eventId, type, teamId, playerId } = eventToDelete;

        if (!draft.teamA || !draft.teamB) return;
        const team = teamId === 'a' ? draft.teamA : draft.teamB;
        if (!team) return;

        const findAndMutatePlayer = (targetPlayerId: number, mutateFn: (p: Player) => Player) => {
            const starterIndex = team.starters.findIndex(p => p.id === targetPlayerId);
            if (starterIndex > -1) {
                team.starters[starterIndex] = mutateFn(team.starters[starterIndex]);
                return;
            }
            const subIndex = team.subs.findIndex(p => p.id === targetPlayerId);
            if (subIndex > -1) {
                team.subs[subIndex] = mutateFn(team.subs[subIndex]);
            }
        };

        switch (type) {
            case 'GOAL':
                if (playerId) {
                    findAndMutatePlayer(playerId, player => {
                        const initialLength = player.goals.length;
                        const newGoals = player.goals.filter(g => g.id !== eventId);
                        if (newGoals.length < initialLength) {
                            team.score = Math.max(0, team.score - 1);
                        }
                        return { ...player, goals: newGoals };
                    });
                }
                break;

            case 'YELLOW_CARD':
                if (playerId) {
                    findAndMutatePlayer(playerId, player => {
                        const wasRedFromTwoYellows = player.yellowCards.length === 2 && player.redCard;
                        const newYellowCards = player.yellowCards.filter(yc => yc.id !== eventId);
                        if (wasRedFromTwoYellows) {
                            // Find the red card that was generated by the second yellow
                            const redCardFromYellowId = player.redCard?.id;
                             if (redCardFromYellowId) {
                                return { ...player, yellowCards: newYellowCards, redCard: null, isSentOff: false };
                            }
                        }
                        return { ...player, yellowCards: newYellowCards };
                    });
                }
                break;
            
            case 'RED_CARD':
                if (playerId) {
                    findAndMutatePlayer(playerId, player => {
                        if (player.redCard && player.redCard.id === eventId) {
                            // This logic assumes we don't revert the 2nd yellow that might have caused it.
                            // The user would have to delete the yellow card separately.
                            return { ...player, redCard: null, isSentOff: false };
                        }
                        return player;
                    });
                }
                break;

            case 'SUBSTITUTION':
                const subLogEntry = draft.substitutionLog.find(sub => sub.id === eventId);
                if (subLogEntry) {
                    const playerWhoEntered = team.starters.find(p => p.id === subLogEntry.playerIn.id);
                    const playerWhoExited = team.subs.find(p => p.id === subLogEntry.playerOut.id);

                    if (playerWhoEntered && playerWhoExited) {
                        const restoredPlayerOut = {
                            ...playerWhoExited,
                            isOnField: true,
                            position: playerWhoEntered.position,
                            positionName: playerWhoEntered.positionName,
                            positionAbbr: playerWhoEntered.positionAbbr,
                        };
                        const restoredPlayerIn = {
                            ...playerWhoEntered,
                            isOnField: false,
                            position: { x: -1, y: -1 },
                            positionName: 'Suplente',
                            positionAbbr: 'SUP',
                        };

                        team.starters = [...team.starters.filter(p => p.id !== playerWhoEntered.id), restoredPlayerOut];
                        team.subs = [...team.subs.filter(p => p.id !== playerWhoExited.id), restoredPlayerIn];
                        
                        draft.substitutionLog = draft.substitutionLog.filter(sub => sub.id !== eventId);
                    }
                }
                break;

            case 'GOAL_CHANCE':
            case 'OFFSIDE':
                const statKey = type === 'GOAL_CHANCE' ? 'goalChances' : 'offsidesCommitted';
                if (playerId) {
                    findAndMutatePlayer(playerId, player => ({
                        ...player,
                        [statKey]: (player[statKey] as StatEvent[]).filter(e => e.id !== eventId)
                    }));
                }
                break;

            case 'CORNER':
                team.cornersFor = team.cornersFor.filter(c => c.id !== eventId);
                break;
            
            case 'FOUL':
                team.foulsCommitted = team.foulsCommitted.filter(f => f.id !== eventId);
                break;
        }
    });
};
  
  const handleSaveEvent = (eventId: string, newMinute: number) => {
    if (!editingEvent || editingEvent.id !== eventId) return;

    updateMatch(draft => {
        const { type, teamId, playerId } = editingEvent;

        if (!draft.teamA || !draft.teamB) return;
        const team = teamId === 'a' ? draft.teamA : draft.teamB;
        if (!team) return;

        const updateEventMinute = (arr: StatEvent[], id: string) => {
             const eventIndex = arr.findIndex(e => e.id === id);
             if (eventIndex > -1) arr[eventIndex].minute = newMinute;
        };
        
        const findAndMutatePlayer = (pId: number, mutateFn: (player: Player) => void) => {
             let player = team.starters.find(p => p.id === pId);
             if (player) { mutateFn(player); return; }
             player = team.subs.find(p => p.id === pId);
             if (player) { mutateFn(player); }
        };

        switch (type) {
            case 'GOAL':
                if (playerId) findAndMutatePlayer(playerId, p => updateEventMinute(p.goals, eventId));
                break;
            case 'YELLOW_CARD':
                if (playerId) findAndMutatePlayer(playerId, p => updateEventMinute(p.yellowCards, eventId));
                break;
            case 'RED_CARD':
                 if (playerId) findAndMutatePlayer(playerId, p => {
                    if (p.redCard && p.redCard.id === eventId) p.redCard.minute = newMinute;
                 });
                break;
            case 'SUBSTITUTION':
                 const subIndex = draft.substitutionLog.findIndex(s => s.id === eventId);
                 if (subIndex > -1) draft.substitutionLog[subIndex].minute = newMinute;
                break;
            case 'GOAL_CHANCE':
                if (playerId) findAndMutatePlayer(playerId, p => updateEventMinute(p.goalChances, eventId));
                break;
            case 'OFFSIDE':
                if (playerId) findAndMutatePlayer(playerId, p => updateEventMinute(p.offsidesCommitted, eventId));
                break;
            case 'CORNER':
                updateEventMinute(team.cornersFor, eventId);
                break;
            case 'FOUL':
                updateEventMinute(team.foulsCommitted, eventId);
                break;
        }
    });

    setEditingEvent(null);
  };

  const matchEvents = useMemo(() => {
    const { teamA, teamB, substitutionLog } = match;
    if (!teamA || !teamB) return [];

    const processPlayerEvents = (team: Team, teamId: TeamId): MatchEvent[] => {
        const players = [...team.starters, ...team.subs];
        return players.flatMap(p => [
            ...p.goals.map((g): MatchEvent => ({ id: g.id, minute: g.minute, teamId, teamName: team.name, type: 'GOAL', detail: `Gol de ${p.name} (#${p.number})`, playerId: p.id })),
            ...p.yellowCards.map((yc): MatchEvent => ({ id: yc.id, minute: yc.minute, teamId, teamName: team.name, type: 'YELLOW_CARD', detail: `Tarjeta amarilla para ${p.name} (#${p.number})`, playerId: p.id })),
            ...(p.redCard ? [{ id: p.redCard.id, minute: p.redCard.minute, teamId, teamName: team.name, type: 'RED_CARD', detail: `Tarjeta roja para ${p.name} (#${p.number})`, playerId: p.id } as MatchEvent] : []),
            ...p.goalChances.map((gc): MatchEvent => ({ id: gc.id, minute: gc.minute, teamId, teamName: team.name, type: 'GOAL_CHANCE', detail: `Ocasión de ${p.name} (#${p.number})`, playerId: p.id })),
            ...p.offsidesCommitted.map((o): MatchEvent => ({ id: o.id, minute: o.minute, teamId, teamName: team.name, type: 'OFFSIDE', detail: `Fuera de juego de ${p.name} (#${p.number})`, playerId: p.id })),
        ]);
    };

    const processTeamStats = (team: Team, teamId: TeamId): MatchEvent[] => [
        ...team.cornersFor.map((c): MatchEvent => ({ id: c.id, minute: c.minute, teamId, teamName: team.name, type: 'CORNER', detail: 'Córner a favor'})),
        ...team.foulsCommitted.map((f): MatchEvent => ({ id: f.id, minute: f.minute, teamId, teamName: team.name, type: 'FOUL', detail: 'Falta cometida'}))
    ];

    const subEvents: MatchEvent[] = substitutionLog.map((s) => ({
        id: s.id,
        minute: s.minute,
        teamId: s.teamId,
        teamName: s.teamId === 'a' ? teamA.name : teamB.name,
        type: 'SUBSTITUTION',
        detail: `Sale ${s.playerOut.name} / Entra ${s.playerIn.name}`,
        playerOut: s.playerOut,
        playerIn: s.playerIn,
    }));

    const allEvents = [
        ...processPlayerEvents(teamA, 'a'), ...processPlayerEvents(teamB, 'b'),
        ...processTeamStats(teamA, 'a'), ...processTeamStats(teamB, 'b'),
        ...subEvents
    ];
    return allEvents.sort((a, b) => a.minute - b.minute);
  }, [match]);

  const isRosterEditable = true;
  const isMatchActionEnabled = match.matchState !== MatchState.NOT_STARTED;
  
  const { teamA, teamB } = match;
  if (!teamA || !teamB) return <div className="text-center p-8">Iniciando partido...</div>;

  const myTeamId = match.details.myTeamLocation === 'home' ? 'a' : 'b';

  const tabButtonStyle = (tabName: 'pizarra' | 'multimedia') => `tab-nav-button ${activeTab === tabName ? 'active' : ''}`;

  return (
    <>
      <Header
        matchState={match.matchState} totalSeconds={match.totalSeconds} isRunning={isRunning} halfDurationMinutes={match.halfDurationMinutes}
        teamA={teamA} teamB={teamB} onStartPause={handleStartPause} onMinuteChange={handleMinuteChange}
        onHalfDurationChange={handleHalfDurationChange} onResetHalf={handleResetHalf}
        onEndMatch={handleEndMatch} onBackToDashboard={onBackToDashboard} showSaveIndicator={showSaveIndicator}
        isLiveModeActive={isLiveModeActive} onToggleLiveMode={() => setIsLiveModeActive(prev => !prev)}
      />
      
      {isLiveModeActive ? (
         <LiveModeOverlay
          teamA={teamA}
          teamB={teamB}
          events={matchEvents}
          onAddGoal={handleAddGoal}
          onGiveCard={handleGiveCard}
          onTeamStatChange={handleTeamStatChange}
          onInitiateSub={handleInitiateSub}
          onUpdatePlayerStat={handleUpdatePlayerStat}
        />
      ) : (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <TeamPanel team={teamA} opponentTeam={teamB} teamId="a" isMyTeam={myTeamId === 'a'} matchState={match.matchState} isRosterEditable={isRosterEditable} isMatchActionEnabled={isMatchActionEnabled} onUpdateTeamName={handleUpdateTeamName} onUpdateTeamLogo={handleUpdateTeamLogo} onUpdatePlayer={handleUpdatePlayer} onGiveCard={handleGiveCard} onRemoveCard={handleRemoveCard} onInitiateSub={handleInitiateSub} onUpdatePlayerStat={handleUpdatePlayerStat} onAddGoal={handleAddGoal} onTeamStatChange={handleTeamStatChange} />
                <TeamPanel team={teamB} opponentTeam={teamA} teamId="b" isMyTeam={myTeamId === 'b'} matchState={match.matchState} isRosterEditable={isRosterEditable} isMatchActionEnabled={isMatchActionEnabled} onUpdateTeamName={handleUpdateTeamName} onUpdateTeamLogo={handleUpdateTeamLogo} onUpdatePlayer={handleUpdatePlayer} onGiveCard={handleGiveCard} onRemoveCard={handleRemoveCard} onInitiateSub={handleInitiateSub} onUpdatePlayerStat={handleUpdatePlayerStat} onAddGoal={handleAddGoal} onTeamStatChange={handleTeamStatChange} />
            </div>

            <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
                <h2 className="text-xl font-bold text-center text-cyan-400 mb-4">Minuto a Minuto</h2>
                <EventLog events={matchEvents} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} />
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg">
                <div className="flex border-b border-gray-700">
                    <button onClick={() => setActiveTab('pizarra')} className={tabButtonStyle('pizarra')}>
                        Pizarra Táctica
                    </button>
                    <button onClick={() => setActiveTab('multimedia')} className={tabButtonStyle('multimedia')}>
                        Multimedia
                    </button>
                </div>
                <div className="p-4">
                    {activeTab === 'pizarra' && (
                        <Formations teamA={teamA} teamB={teamB} onPlayerMove={handlePlayerMove} onFormationChange={handleFormationChange} />
                    )}
                    {activeTab === 'multimedia' && (
                         <MediaManager media={match.media} onMediaChange={(newMedia) => updateMatch(draft => { draft.media = newMedia; })} />
                    )}
                </div>
            </div>

            <SubstitutionLog substitutionLog={match.substitutionLog} teamA={teamA} teamB={teamB} />
        </>
      )}

      {isSubModalOpen && <SubstitutionModal isOpen={isSubModalOpen} team={substitutionContext.teamId === 'a' ? teamA : teamB} onClose={() => setIsSubModalOpen(false)} onConfirm={handleConfirmSubstitutions} />}
      {goalTypeModalContext && <GoalTypeModal isOpen={!!goalTypeModalContext} onClose={() => setGoalTypeModalContext(null)} onConfirm={handleConfirmGoalType} />}
      {editingEvent && <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} onSave={handleSaveEvent} />}
    </>
  );
};

export default MatchControl;
