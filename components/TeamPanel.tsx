import React, { useState, memo, useRef, useCallback } from 'react';
import { MatchState, type Team, type TeamId, type PlayerStatKeys, type StatEvent } from '../types';
import PlayerCard from './PlayerCard';
import { ClockIcon, SubstituteIcon } from './icons';

interface TeamPanelProps {
  team: Team;
  opponentTeam: Team;
  teamId: TeamId;
  isMyTeam: boolean;
  matchState: MatchState;
  isRosterEditable: boolean;
  isMatchActionEnabled: boolean;
  onUpdateTeamName: (teamId: TeamId, name:string) => void;
  onUpdateTeamLogo: (teamId: TeamId, file: File) => void;
  onUpdatePlayer: (teamId: TeamId, playerId: number, field: 'name' | 'number', value: string) => void;
  onGiveCard: (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => void;
  onRemoveCard: (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => void;
  onInitiateSub: (teamId: TeamId) => void;
  onUpdatePlayerStat: (teamId: TeamId, playerId: number, stat: PlayerStatKeys, action: 'add' | 'remove') => void;
  onAddGoal: (teamId: TeamId, playerId: number) => void;
  onTeamStatChange: (teamId: TeamId, stat: 'cornersFor' | 'foulsCommitted', action: 'add' | 'remove') => void;
}

// Helper function to process, resize, and reconstruct an image file.
const processImageFile = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
        if (!isImage) {
            return reject(new Error('El archivo no es un tipo de imagen válido.'));
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error('No se pudo leer el archivo para procesarlo.'));
            }

            const img = new Image();
            img.src = event.target.result as string;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_DIMENSION = 512;
                let { width, height } = img;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height = Math.round(height * (MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width = Math.round(width * (MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('No se pudo obtener el contexto del canvas.'));
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // Create a new File object with the correct MIME type
                            const newFile = new File([blob], file.name, { type: 'image/jpeg' });
                            resolve(newFile);
                        } else {
                            reject(new Error('Fallo al crear el blob desde el canvas.'));
                        }
                    },
                    'image/jpeg',
                    0.9
                );
            };
            img.onerror = () => reject(new Error('No se pudo cargar la imagen para procesarla.'));
        };
        reader.onerror = () => reject(new Error('Falló la lectura del archivo.'));
    });
};


const StatRow: React.FC<{ label: string; value: StatEvent[]; isInteractive?: boolean; onUpdate?: (action: 'add' | 'remove') => void; isMatchActionEnabled: boolean; }> = memo(({ label, value, isInteractive = false, onUpdate, isMatchActionEnabled }) => {
  const [minutesVisible, setMinutesVisible] = useState(false);
  const hasEvents = value.length > 0;

  return (
      <div className="bg-gray-700/50 p-2 rounded-md">
        <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-200">{label}</span>
            <div className="flex items-center gap-1.5">
                {isInteractive ? (
                    <>
                        <button onClick={() => onUpdate?.('remove')} disabled={!isMatchActionEnabled || !hasEvents} className="bg-gray-600 hover:bg-gray-500 w-6 h-6 rounded-full font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">-</button>
                        <span className="w-6 text-center font-semibold">{value.length}</span>
                        <button onClick={() => onUpdate?.('add')} disabled={!isMatchActionEnabled} className="bg-gray-600 hover:bg-gray-500 w-6 h-6 rounded-full font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                    </>
                ) : (
                    <span className="font-bold text-lg text-white">{value.length}</span>
                )}
                <button
                    onClick={() => {
                        if (hasEvents) {
                            setMinutesVisible(prev => !prev);
                        }
                    }}
                    className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-1"
                    disabled={!hasEvents}
                    title={hasEvents ? "Ver minutos" : "Sin eventos"}
                >
                    <ClockIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
        {minutesVisible && hasEvents && (
            <div className="text-right text-xs text-gray-400 pt-1">
                <span className="font-semibold">Min:</span> {value.map(e => e.minute).join("', ")}'
            </div>
        )}
    </div>
  );
});

const TeamPanel: React.FC<TeamPanelProps> = ({ team, opponentTeam, teamId, isMyTeam, matchState, isRosterEditable, isMatchActionEnabled, onUpdateTeamName, onUpdateTeamLogo, onUpdatePlayer, onGiveCard, onRemoveCard, onInitiateSub, onUpdatePlayerStat, onTeamStatChange, onAddGoal }) => {
  const borderFocusClass = teamId === 'a' ? 'focus:border-blue-500' : 'focus:border-pink-500';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const teamOffsides = [...team.starters, ...team.subs].flatMap(p => p.offsidesCommitted);

  const handleLogoClick = () => {
    if (isRosterEditable) {
        fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = ''; // Reset input to allow re-uploading same file

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('La imagen es demasiado grande. Por favor, elige una de menos de 5MB.');
        return;
    }

    try {
        const processedFile = await processImageFile(file);
        onUpdateTeamLogo(teamId, processedFile);
    } catch (error) {
        console.error("Error processing logo:", error);
        alert(`Error al procesar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  return (
    <div className="relative bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col gap-4 min-h-[700px]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <div className="flex justify-center mb-2">
          <div
              onClick={handleLogoClick}
              className={`w-28 h-28 rounded-full flex-shrink-0 bg-gray-700 flex items-center justify-center ${isRosterEditable ? 'cursor-pointer' : 'cursor-default'} transition-colors border-2 border-gray-600`}
              style={{
                  backgroundImage: team.logo ? `url(${team.logo})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }}
              title={isRosterEditable ? "Cambiar escudo" : "Escudo del equipo"}
            >
              {!team.logo && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
              )}
          </div>
      </div>


      <div className="flex items-center gap-4">
        <div className="flex-grow">
            <input
                type="text"
                value={team.name}
                onChange={(e) => onUpdateTeamName(teamId, e.target.value)}
                className={`team-name-input w-full bg-transparent text-xl font-bold text-center border-b-2 border-gray-600 ${borderFocusClass} outline-none disabled:opacity-70 disabled:cursor-not-allowed`}
                disabled={!isRosterEditable}
            />
        </div>
        <span className="text-3xl font-bold flex-shrink-0">{team.score}</span>
      </div>

      <div className="border-t border-b border-gray-700/80 py-3">
        <h4 className="font-semibold text-lg mb-2 text-center" style={{ color: isMyTeam ? 'var(--secondary-color)' : '#f472b6' }}>Estadísticas del Equipo</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <StatRow 
              key={`${teamId}-cornersFor`}
              label="Corners a Favor" 
              value={team.cornersFor} 
              isInteractive={true} 
              onUpdate={(action) => onTeamStatChange(teamId, 'cornersFor', action)}
              isMatchActionEnabled={isMatchActionEnabled}
          />
          <StatRow 
              key={`${teamId}-foulsCommitted`}
              label="Faltas Cometidas"
              value={team.foulsCommitted}
              isInteractive={true}
              onUpdate={(action) => onTeamStatChange(teamId, 'foulsCommitted', action)}
              isMatchActionEnabled={isMatchActionEnabled}
          />
           <StatRow 
              key={`${teamId}-foulsReceived`}
              label="Faltas Recibidas"
              value={opponentTeam.foulsCommitted}
              isInteractive={false}
              isMatchActionEnabled={isMatchActionEnabled}
          />
           <div className="sm:col-span-2">
            <StatRow 
                key={`${teamId}-offsides`}
                label="Fueras de Juego"
                value={teamOffsides}
                isInteractive={false}
                isMatchActionEnabled={isMatchActionEnabled}
            />
          </div>
           <div className={`sm:col-span-2 bg-gray-700/50 p-2 rounded-md ${team.substitutionWindows === 0 ? 'text-red-400' : ''}`}>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Ventanas de Cambios</span>
                    <span className="font-bold text-lg">{team.substitutionWindows}</span>
                </div>
                {team.substitutionWindows === 0 && matchState !== MatchState.HALF_TIME && <p className="text-xs text-center mt-1 text-red-400 font-semibold">No se pueden realizar más cambios.</p>}
            </div>
        </div>
      </div>
      
      <div className="space-y-4 flex-grow flex flex-col">
        <button
            onClick={() => onInitiateSub(teamId)}
            disabled={!isMatchActionEnabled || (team.substitutionWindows <= 0 && matchState !== MatchState.HALF_TIME) || matchState === MatchState.FULL_TIME}
            className="w-full flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:brightness-90 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
            <SubstituteIcon />
            Realizar Cambios
        </button>
        <div className="flex-grow overflow-y-auto pr-2 -mr-4">
            <div className="space-y-2">
                <h3 className="font-semibold text-lg mb-2 text-green-400 sticky top-0 bg-gray-800 py-1">Titulares</h3>
                {team.starters.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    teamId={teamId}
                    isMyTeam={isMyTeam}
                    onUpdatePlayer={onUpdatePlayer}
                    onGiveCard={onGiveCard}
                    onRemoveCard={onRemoveCard}
                    isRosterEditable={isRosterEditable}
                    isMatchActionEnabled={isMatchActionEnabled}
                    onUpdatePlayerStat={onUpdatePlayerStat}
                    onAddGoal={onAddGoal}
                  />
                ))}
            </div>
            <div className="space-y-2 mt-4">
                <h3 className="font-semibold text-lg mb-2 text-yellow-400 sticky top-0 bg-gray-800 py-1">Suplentes</h3>
                {team.subs.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    teamId={teamId}
                    isMyTeam={isMyTeam}
                    onUpdatePlayer={onUpdatePlayer}
                    onGiveCard={onGiveCard}
                    onRemoveCard={onRemoveCard}
                    isRosterEditable={isRosterEditable}
                    isMatchActionEnabled={isMatchActionEnabled}
                    onUpdatePlayerStat={onUpdatePlayerStat}
                    onAddGoal={onAddGoal}
                  />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPanel;