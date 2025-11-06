import React, { useState, memo, useEffect } from 'react';
import type { Player, TeamId, PlayerStatKeys, StatEvent, GoalEvent } from '../types';
import { CardIcon, ChevronDownIcon, ClockIcon, PhotoPlaceholderIcon } from './icons';
import { GOAL_TYPES } from '../types';
import { getMedia } from './db';

interface PlayerCardProps {
  player: Player;
  teamId: TeamId;
  isMyTeam: boolean;
  isRosterEditable: boolean;
  isMatchActionEnabled: boolean;
  onUpdatePlayer: (teamId: TeamId, playerId: number, field: 'name' | 'number', value: string) => void;
  onGiveCard: (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => void;
  onRemoveCard: (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => void;
  onUpdatePlayerStat: (teamId: TeamId, playerId: number, stat: PlayerStatKeys, action: 'add' | 'remove') => void;
  onAddGoal: (teamId: TeamId, playerId: number) => void;
}

const PlayerPhoto: React.FC<{ photoId?: string; alt: string }> = memo(({ photoId, alt }) => {
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


const StatInputGroup: React.FC<{ label: string; statKey: PlayerStatKeys; value: StatEvent[] | GoalEvent[], teamId: TeamId, player: Player, isMatchActionEnabled: boolean, onUpdatePlayerStat: PlayerCardProps['onUpdatePlayerStat'], onAddGoal?: PlayerCardProps['onAddGoal'] }> = memo(({ label, statKey, value, teamId, player, isMatchActionEnabled, onUpdatePlayerStat, onAddGoal }) => {
    const [minutesVisible, setMinutesVisible] = useState(false);
    const hasEvents = value.length > 0;

    const handleAddClick = () => {
        if (statKey === 'goals' && onAddGoal) {
            onAddGoal(teamId, player.id);
        } else {
            onUpdatePlayerStat(teamId, player.id, statKey, 'add');
        }
    }

    return (
      <div>
        <div className="flex justify-between items-center py-1">
          <span className="text-sm text-gray-300 flex-1 truncate">{label}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdatePlayerStat(teamId, player.id, statKey, 'remove')}
              className="bg-gray-600 hover:bg-gray-500 w-6 h-6 rounded-full font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isMatchActionEnabled || !hasEvents}
              aria-label={`Disminuir ${label}`}
            >
              -
            </button>
            <span className="w-6 text-center font-medium tabular-nums">{value.length}</span>
            <button
              onClick={handleAddClick}
              className="bg-gray-600 hover:bg-gray-500 w-6 h-6 rounded-full font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isMatchActionEnabled}
              aria-label={`Aumentar ${label}`}
            >
              +
            </button>
             <button
                onClick={() => {
                    if (hasEvents) {
                        setMinutesVisible(prev => !prev);
                    }
                }}
                className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!hasEvents}
                title={hasEvents ? "Ver minutos" : "Sin eventos"}
            >
                <ClockIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {minutesVisible && hasEvents && (
            <div className="text-right text-xs text-gray-400 pr-4 pb-1">
                <span className="font-semibold">Min:</span> {
                    (value as GoalEvent[]).map(e => {
                        const typeAbbr = e.type && GOAL_TYPES[e.type] ? `(${GOAL_TYPES[e.type].substring(0,3).toUpperCase()})` : '';
                        return `${e.minute}'${typeAbbr}`;
                    }).join(", ")
                }
            </div>
        )}
      </div>
    );
});


const PlayerCard: React.FC<PlayerCardProps> = ({ player, teamId, isMyTeam, isRosterEditable, isMatchActionEnabled, onUpdatePlayer, onGiveCard, onRemoveCard, onUpdatePlayerStat, onAddGoal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const commonStatProps = {
      teamId,
      player,
      isMatchActionEnabled,
      onUpdatePlayerStat,
      onAddGoal
  };

  const playerInfoClass = player.isSentOff ? 'line-through opacity-60' : '';

  return (
    <div className={`transition-all duration-300 rounded-md ${player.isSentOff ? 'bg-red-900/50' : 'bg-gray-700'}`}>
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3 flex-grow">
          {isMyTeam && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 overflow-hidden border-2 border-gray-500">
                <PlayerPhoto photoId={player.photoId} alt={player.name} />
            </div>
          )}
          <input
            type="number"
            value={player.number}
            onChange={(e) => onUpdatePlayer(teamId, player.id, 'number', e.target.value)}
            className="player-number bg-gray-600 w-12 text-center rounded p-1 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={!isRosterEditable}
            aria-label={`Número de ${player.name}`}
          />
          <div className="flex-grow">
            <input
              type="text"
              value={player.name}
              onChange={(e) => onUpdatePlayer(teamId, player.id, 'name', e.target.value)}
              className={`player-name bg-transparent ${playerInfoClass} w-full disabled:opacity-70 disabled:cursor-not-allowed`}
              disabled={!isRosterEditable}
              aria-label={`Nombre de la jugadora número ${player.number}`}
            />
            {player.isOnField && <span className="text-xs text-gray-400 ml-1">{player.positionName}</span>}
          </div>
          <div className="cards flex-shrink-0 flex items-center gap-1">
             {player.yellowCards.map((card, index) => (
              <button
                key={`yellow-${index}`}
                onClick={() => onRemoveCard(teamId, player.id, 'yellow')}
                title={`Quitar Tarjeta Amarilla (min ${card.minute})`}
                className="appearance-none bg-transparent border-none p-0 cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-sm disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={!isMatchActionEnabled}
              >
                <div className="card-yellow">
                  <span>{card.minute}'</span>
                </div>
              </button>
            ))}
            {player.redCard && (
              <button
                onClick={() => onRemoveCard(teamId, player.id, 'red')}
                title={`Quitar Tarjeta Roja (min ${player.redCard.minute})`}
                className="appearance-none bg-transparent border-none p-0 cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-red-400 rounded-sm disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={!isMatchActionEnabled}
              >
                <div className="card-red">
                  <span>{player.redCard.minute}'</span>
                </div>
              </button>
            )}
          </div>
        </div>
        <div className="player-actions flex items-center gap-1 sm:gap-2 ml-2">
          <button
            className="give-yellow bg-yellow-500 hover:bg-yellow-600 p-2 rounded-full transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Tarjeta Amarilla"
            onClick={() => onGiveCard(teamId, player.id, 'yellow')}
            disabled={player.isSentOff || !isMatchActionEnabled}
          >
            <CardIcon />
          </button>
          <button
            className="give-red bg-red-500 hover:bg-red-600 p-2 rounded-full transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Tarjeta Roja"
            onClick={() => onGiveCard(teamId, player.id, 'red')}
            disabled={player.isSentOff || !isMatchActionEnabled}
          >
            <CardIcon />
          </button>
           <button
            className="p-1 rounded-full hover:bg-gray-600/50 transition-colors"
            title={isExpanded ? 'Ocultar Estadísticas' : 'Mostrar Estadísticas'}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <ChevronDownIcon className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      <div className={`collapsible-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="collapsible-content">
          <div className="px-3 pt-3 pb-3 border-t border-gray-600/50">
            <h4 className="font-semibold text-sm mb-1 text-cyan-400">Estadísticas Individuales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              {player.isGoalkeeper ? (
                <>
                  <StatInputGroup key="goals" label="Goles" statKey="goals" value={player.goals} {...commonStatProps} />
                  <StatInputGroup key="goalsConceded" label="Goles Encajados" statKey="goalsConceded" value={player.goalsConceded} {...commonStatProps} />
                  <StatInputGroup key="saves" label="Paradas" statKey="saves" value={player.saves} {...commonStatProps} />
                  <StatInputGroup key="penaltiesSaved" label="Penaltis Parados" statKey="penaltiesSaved" value={player.penaltiesSaved} {...commonStatProps} />
                  <StatInputGroup key="penaltiesCommitted" label="Penaltis Cometidos" statKey="penaltiesCommitted" value={player.penaltiesCommitted} {...commonStatProps} />
                </>
              ) : (
                <>
                  <StatInputGroup key="goals" label="Goles" statKey="goals" value={player.goals} {...commonStatProps} />
                  <StatInputGroup key="goalChances" label="Ocasiones de Gol" statKey="goalChances" value={player.goalChances} {...commonStatProps} />
                  <StatInputGroup key="penaltiesMissed" label="Penaltis Fallados" statKey="penaltiesMissed" value={player.penaltiesMissed} {...commonStatProps} />
                  <StatInputGroup key="penaltiesCommitted" label="Penaltis Cometidos" statKey="penaltiesCommitted" value={player.penaltiesCommitted} {...commonStatProps} />
                  <StatInputGroup key="offsidesCommitted" label="Fueras de Juego" statKey="offsidesCommitted" value={player.offsidesCommitted} {...commonStatProps} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;