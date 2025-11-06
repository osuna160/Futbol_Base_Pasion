import React, { useMemo, useState, useEffect } from 'react';
import type { RosterPlayer, Match, MatchType, AggregatedPlayerStats } from '../types';
import { MatchState, MATCH_TYPES } from '../types';
import { calculateMinutesPlayed } from './report-utils';
import { ChevronDownIcon, TshirtIcon, ShieldCheckIcon, StopIcon, BallIcon, CardIcon, SparklesIcon, PhotoPlaceholderIcon } from './icons';
import { GoogleGenAI } from '@google/genai';
import { getMedia } from './db';

interface PlayerStatsDashboardProps {
  roster: RosterPlayer[];
  matches: Match[];
}

const calculatePlayerStats = (playerId: number, matches: Match[]): AggregatedPlayerStats => {
    const initialStats: AggregatedPlayerStats = {
        gamesPlayed: 0, started: 0, subbedIn: 0, minutesPlayed: 0,
        bench: 0, unavailable: 0, notCalledUp: 0,
        goals: 0, yellowCards: 0, redCards: 0,
        goalsConceded: 0, saves: 0,
    };

    return matches.reduce((stats, match) => {
        if (match.matchState !== MatchState.FULL_TIME) return stats;

        const isMyTeamA = match.teamA?.name.includes('Sant Gabriel');
        const myTeam = isMyTeamA ? match.teamA : match.teamB;
        const myTeamId = isMyTeamA ? 'a' : 'b';
        
        if (!myTeam) return stats;

        const myTeamSetup = isMyTeamA ? match.myTeamSetup : match.opponentTeamSetup;
        
        const starterIds = new Set(myTeamSetup.starters.map(p => p.playerId));
        const subIds = new Set(myTeamSetup.subs.map(p => p.id));
        const unavailableIds = new Set(myTeamSetup.unavailable.map(p => p.id));

        const isInvolved = starterIds.has(playerId) || subIds.has(playerId) || unavailableIds.has(playerId);
        if (!isInvolved) {
            stats.notCalledUp++;
            return stats;
        }

        if (unavailableIds.has(playerId)) {
            stats.unavailable++;
            return stats;
        }

        stats.gamesPlayed++;

        const playerInMatch = [...(myTeam.starters || []), ...(myTeam.subs || [])].find(p => p.id === playerId);
        const initialStarters = isMyTeamA ? match.initialStartersA : match.initialStartersB;
        const wasStarter = initialStarters.some(p => p.id === playerId);

        if(wasStarter) {
            stats.started++;
        }

        const subEvents = match.substitutionLog.filter(s => s.teamId === myTeamId);
        const subInEvent = subEvents.find(s => s.playerIn.id === playerId);

        if(subInEvent) {
            stats.subbedIn++;
        }
        
        const minutes = playerInMatch ? calculateMinutesPlayed(playerInMatch, match.substitutionLog, match.halfDurationMinutes, wasStarter) : 0;
        stats.minutesPlayed += minutes;
        
        if (minutes === 0 && subIds.has(playerId) && !subInEvent) {
            stats.bench++;
        }
        
        if (playerInMatch) {
            stats.goals += playerInMatch.goals.length;
            stats.yellowCards += playerInMatch.yellowCards.length;
            stats.redCards += playerInMatch.redCard ? 1 : 0;
            if (playerInMatch.isGoalkeeper) {
                stats.goalsConceded += playerInMatch.goalsConceded.length;
                stats.saves += playerInMatch.saves.length;
            }
        }

        return stats;
    }, initialStats);
};

const StatItem: React.FC<{ label: string, value: number | string, icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex justify-between items-center text-sm py-1">
        <div className="flex items-center gap-2 text-gray-300">
            {icon}
            <span>{label}</span>
        </div>
        <span className="font-semibold text-white">{value}</span>
    </div>
);

const PlayerPhoto: React.FC<{ photoId?: string; alt: string }> = React.memo(({ photoId, alt }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
    
        const loadUrl = async () => {
            if (photoId) {
                try {
                    const blob = await getMedia(photoId);
                    if (blob) {
                        objectUrl = URL.createObjectURL(blob);
                        setImageUrl(objectUrl);
                    } else {
                        setImageUrl(null);
                    }
                } catch (error) {
                    console.error(`Failed to load media for id ${photoId}`, error);
                    setImageUrl(null);
                }
            } else {
                setImageUrl(null);
            }
        };
    
        loadUrl();
    
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [photoId]);

    if (imageUrl) {
        return <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />;
    }
    return (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
            <PhotoPlaceholderIcon className="w-6 h-6" />
        </div>
    );
});


const PlayerStatCard: React.FC<{ player: RosterPlayer, stats: AggregatedPlayerStats }> = ({ player, stats }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateAnalysis = async () => {
        setIsLoading(true);
        setError('');
        setAnalysis('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                Actúa como un analista de fútbol profesional especializado en fútbol formativo.
                Analiza las siguientes estadísticas de la jugadora ${player.name} (dorsal ${player.number}) y genera un informe de texto breve (máximo 100 palabras).
                El informe debe ser constructivo, objetivo y basarse únicamente en los datos proporcionados.
                Destaca sus fortalezas, posibles áreas de mejora y cualquier tendencia notable en su rendimiento.
                
                Estadísticas:
                - Partidos jugados: ${stats.gamesPlayed}
                - Partidos como titular: ${stats.started}
                - Partidos entrando como suplente: ${stats.subbedIn}
                - Minutos totales jugados: ${stats.minutesPlayed}
                - Goles: ${stats.goals}
                - Tarjetas amarillas: ${stats.yellowCards}
                - Tarjetas rojas: ${stats.redCards}
                ${stats.saves > 0 || stats.goalsConceded > 0 ? `
                - Paradas (si es portera): ${stats.saves}
                - Goles encajados (si es portera): ${stats.goalsConceded}
                ` : ''}

                El tono debe ser profesional y de apoyo, adecuado para un entrenador.
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setAnalysis(response.text);
        } catch (err) {
            console.error(err);
            setError('No se pudo generar el análisis. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = () => {
        if(analysis) {
            navigator.clipboard.writeText(analysis).then(() => {
                alert('Análisis copiado al portapapeles.');
            });
        }
    };

    return (
        <div className="bg-gray-700/50 rounded-lg">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-3 text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-gray-600 overflow-hidden border-2 border-gray-500">
                            <PlayerPhoto photoId={player.photoId} alt={player.name} />
                        </div>
                        <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-800">
                            {player.number}
                        </span>
                    </div>
                    <span className="font-bold text-lg">{player.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                    <div className="text-center hidden sm:block">
                        <div className="font-bold text-white">{stats.gamesPlayed}</div>
                        <div>PJ</div>
                    </div>
                    <div className="text-center hidden sm:block">
                        <div className="font-bold text-white">{stats.minutesPlayed}'</div>
                        <div>MIN</div>
                    </div>
                    <div className="text-center hidden sm:block">
                        <div className="font-bold text-white">{stats.goals}</div>
                        <div>Goles</div>
                    </div>
                    <ChevronDownIcon className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <div className={`collapsible-container ${isExpanded ? 'expanded' : ''}`}>
                <div className="collapsible-content">
                    <div className="border-t border-gray-600 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                            {/* Column 1: Participation */}
                            <div className="space-y-1">
                                <h4 className="font-semibold text-[var(--secondary-color)] mb-2">Participación</h4>
                                <StatItem label="Partidos Jugados" value={stats.gamesPlayed} icon={<TshirtIcon/>} />
                                <StatItem label="Titular" value={stats.started} />
                                <StatItem label="Suplente (Entró)" value={stats.subbedIn} />
                                <StatItem label="Minutos Jugados" value={`${stats.minutesPlayed}'`} />
                            </div>
                            {/* Column 2: Availability */}
                            <div className="space-y-1">
                                 <h4 className="font-semibold text-[var(--secondary-color)] mb-2">Convocatoria</h4>
                                <StatItem label="Banquillo (Sin jugar)" value={stats.bench} icon={<StopIcon/>} />
                                <StatItem label="No Convocada" value={stats.notCalledUp} />
                                <StatItem label="No Disponible" value={stats.unavailable} />
                            </div>
                            {/* Column 3: Performance */}
                            <div className="space-y-1">
                                <h4 className="font-semibold text-[var(--secondary-color)] mb-2">Rendimiento</h4>
                                <StatItem label="Goles" value={stats.goals} icon={<BallIcon className="w-4 h-4" />} />
                                <StatItem label="Tarjetas Amarillas" value={stats.yellowCards} icon={<CardIcon/>} />
                                <StatItem label="Tarjetas Rojas" value={stats.redCards} icon={<CardIcon/>} />
                                 {(stats.saves > 0 || stats.goalsConceded > 0) && (
                                    <>
                                        <h4 className="font-semibold text-[var(--secondary-color)] mb-2 pt-2">Portera</h4>
                                        <StatItem label="Paradas" value={stats.saves} icon={<ShieldCheckIcon />} />
                                        <StatItem label="Goles Encajados" value={stats.goalsConceded} />
                                    </>
                                )}
                            </div>
                        </div>
                         <div className="mt-4 pt-4 border-t border-gray-600">
                            <button onClick={handleGenerateAnalysis} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait inline-flex items-center gap-2">
                                <SparklesIcon/> {isLoading ? 'Analizando...' : 'Generar Análisis'}
                            </button>
                            {error && <p className="text-red-400 mt-2">{error}</p>}
                            {analysis && (
                                <div className="mt-4 p-3 bg-gray-800/50 rounded-md">
                                    <p className="text-sm whitespace-pre-wrap">{analysis}</p>
                                    <div className="text-right mt-2">
                                         <button onClick={copyToClipboard} className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold py-1 px-3 rounded">
                                            Copiar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlayerStatsDashboard: React.FC<PlayerStatsDashboardProps> = ({ roster, matches }) => {
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchType | 'Todos'>('Todos');

  const filteredMatches = useMemo(() => {
    if (matchTypeFilter === 'Todos') {
      return matches;
    }
    return matches.filter(match => match.details.matchType === matchTypeFilter);
  }, [matches, matchTypeFilter]);

  const playerStatsList = useMemo(() => {
    return roster
      .map(player => ({
        player,
        stats: calculatePlayerStats(player.id, filteredMatches),
      }))
      .sort((a, b) => a.player.number - b.player.number);
  }, [roster, filteredMatches]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold">Estadísticas de Jugadoras</h2>
        <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-400">Competición:</span>
            <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg">
                {(['Todos', ...MATCH_TYPES] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setMatchTypeFilter(f)}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                            matchTypeFilter === f ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-gray-700'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>
        </div>
      </div>
      
      {roster.length > 0 ? (
        <div className="space-y-3">
          {playerStatsList.map(({ player, stats }) => (
            <PlayerStatCard key={player.id} player={player} stats={stats} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-900/50 rounded-lg">
            <h3 className="text-xl font-semibold">No hay jugadoras en la plantilla</h3>
            <p className="text-gray-400 mt-2">
                Ve a "Gestionar Equipo" para añadir jugadoras.
            </p>
        </div>
      )}
    </div>
  );
};

export default PlayerStatsDashboard;