import React from 'react';
import { MatchState, GoalEvent } from '../types';
import type { Team, Player, StatEvent } from '../types';

interface Goal {
  playerName: string;
  minute: number;
}

interface HeaderProps {
  matchState: MatchState;
  totalSeconds: number;
  isRunning: boolean;
  halfDurationMinutes: number;
  teamA: Team;
  teamB: Team;
  onStartPause: () => void;
  onMinuteChange: (minutes: number) => void;
  onHalfDurationChange: (minutes: number) => void;
  onResetHalf: () => void;
  onEndMatch: () => void;
  onBackToDashboard: () => void;
  showSaveIndicator: boolean;
}

const StepperInput: React.FC<{
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}> = ({ label, value, onChange, min = 0, max = 999, disabled = false }) => {
  const handleIncrement = () => {
    if (!disabled && value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (!disabled && value > min) {
      onChange(value - 1);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = parseInt(e.target.value, 10);
      if (isNaN(newValue)) {
          newValue = min;
      }
      if (newValue > max) newValue = max;
      if (newValue < min) newValue = min;
      onChange(newValue);
  };

  const buttonClasses = "bg-gray-600 hover:bg-gray-500 w-8 h-8 rounded-md font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg";

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm w-32 text-right">{label}</label>
      <div className="flex items-center">
        <button
          onClick={handleDecrement}
          className={buttonClasses}
          disabled={disabled || value <= min}
          aria-label={`Disminuir ${label}`}
        >
          -
        </button>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="bg-gray-700 text-white w-16 text-center rounded-md p-1 mx-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          min={min}
          max={max}
          disabled={disabled}
          aria-label={label}
        />
        <button
          onClick={handleIncrement}
          className={buttonClasses}
          disabled={disabled || value >= max}
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
};


const Header: React.FC<HeaderProps> = ({
  matchState,
  totalSeconds,
  isRunning,
  halfDurationMinutes,
  teamA,
  teamB,
  onStartPause,
  onMinuteChange,
  onHalfDurationChange,
  onResetHalf,
  onEndMatch,
  onBackToDashboard,
  showSaveIndicator
}) => {
  const halfDurationSeconds = halfDurationMinutes * 60;

  const getTimerDisplay = () => {
    switch (matchState) {
      case MatchState.NOT_STARTED:
        return "00:00";
      case MatchState.FIRST_HALF: {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
      }
      case MatchState.HALF_TIME:
        return `${String(halfDurationMinutes).padStart(2, '0')}:00`;
      case MatchState.SECOND_HALF: {
        const secondHalfElapsedSeconds = totalSeconds - halfDurationSeconds;
        const currentMinutes = halfDurationMinutes + Math.floor(secondHalfElapsedSeconds / 60);
        const currentSeconds = secondHalfElapsedSeconds % 60;
        return `${String(currentMinutes).padStart(2, '0')}:${String(currentSeconds).padStart(2, '0')}`;
      }
      case MatchState.FULL_TIME:
        return `${String(halfDurationMinutes * 2).padStart(2, '0')}:00`;
      default:
        return "00:00";
    }
  };

  const getMatchPartText = () => {
    switch (matchState) {
      case MatchState.NOT_STARTED: return "No Iniciado";
      case MatchState.FIRST_HALF: return "Primera Parte";
      case MatchState.HALF_TIME: return "Descanso";
      case MatchState.SECOND_HALF: return "Segunda Parte";
      case MatchState.FULL_TIME: return "Finalizado";
      default: return "";
    }
  };

  const getButtonState = () => {
    let text = "";
    let className = "bg-green-600 hover:bg-green-700";
    let disabled = false;

    switch (matchState) {
      case MatchState.NOT_STARTED:
        text = "Iniciar 1ª Parte";
        break;
      case MatchState.FIRST_HALF:
        text = isRunning ? "Pausar" : "Continuar";
        className = isRunning ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700";
        break;
      case MatchState.HALF_TIME:
        text = "Iniciar 2ª Parte";
        break;
      case MatchState.SECOND_HALF:
        text = isRunning ? "Pausar" : "Continuar";
        className = isRunning ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700";
        break;
      case MatchState.FULL_TIME:
        text = "Finalizado";
        className = "bg-gray-500 cursor-not-allowed";
        disabled = true;
        break;
    }
    return { text, className, disabled };
  };

  const getGoalscorers = (team: Team): Goal[] => {
    const allPlayers: Player[] = [...team.starters, ...team.subs];
    const goals: Goal[] = [];

    allPlayers.forEach((player) => {
        player.goals.forEach((event: GoalEvent) => {
            goals.push({ playerName: player.name, minute: event.minute });
        });
    });

    return goals.sort((a, b) => a.minute - b.minute);
  };

  const teamAGoals = getGoalscorers(teamA);
  const teamBGoals = getGoalscorers(teamB);

  const { text: buttonText, className: buttonClassName, disabled: buttonDisabled } = getButtonState();

  const currentMinute = Math.floor(totalSeconds / 60);

  const showResetHalfButton = [MatchState.FIRST_HALF, MatchState.SECOND_HALF].includes(matchState);
  const showEndMatchButton = [MatchState.FIRST_HALF, MatchState.HALF_TIME, MatchState.SECOND_HALF].includes(matchState);

  return (
    <header className="bg-gray-800 rounded-lg p-4 mb-6 shadow-lg">
      <div className="flex justify-between items-center">
        <div className="w-40"> {/* Left placeholder for alignment */}
           {showSaveIndicator && (
              <span className="text-green-400 text-sm transition-opacity duration-500 animate-pulse">
                ✓ Guardado
              </span>
            )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center flex-grow">Control del Partido</h1>
        <div className="w-40 text-right"> {/* Right content */}
            <button onClick={onBackToDashboard} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors text-sm whitespace-nowrap">
                Volver al Inicio
            </button>
        </div>
      </div>
      <div className="text-center text-xl font-semibold text-cyan-400 my-2">{getMatchPartText()}</div>
      
       <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 my-4">
        {/* Team A Info */}
        <div className="flex flex-col items-end text-right">
            <span className="text-xl sm:text-2xl font-bold truncate">{teamA.name}</span>
            <div className="text-sm text-gray-300 mt-2 space-y-1">
                {teamAGoals.map((goal, index) => (
                    <div key={`teamA-goal-${index}`}>{goal.playerName} {goal.minute}'</div>
                ))}
            </div>
        </div>

        {/* Score */}
        <div className="flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold bg-black/30 px-4 py-2 rounded-md">{`${teamA.score} - ${teamB.score}`}</span>
        </div>

        {/* Team B Info */}
        <div className="flex flex-col items-start text-left">
            <span className="text-xl sm:text-2xl font-bold truncate">{teamB.name}</span>
            <div className="text-sm text-gray-300 mt-2 space-y-1">
                {teamBGoals.map((goal, index) => (
                    <div key={`teamB-goal-${index}`}>{goal.playerName} {goal.minute}'</div>
                ))}
            </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 border-t border-gray-700/60 pt-4 mt-4">
        <div className="text-6xl font-mono bg-black/20 px-4 py-2 rounded-md">{getTimerDisplay()}</div>
        <div className="flex flex-col gap-4">
            <StepperInput
                label="Ajustar Minuto:"
                value={currentMinute}
                onChange={onMinuteChange}
                min={0}
            />
            <StepperInput
                label="Minutos por Parte:"
                value={halfDurationMinutes}
                onChange={onHalfDurationChange}
                min={1}
                disabled={matchState !== MatchState.NOT_STARTED}
            />
        </div>
        <div className="flex gap-2 sm:gap-4 flex-wrap justify-center">
           {matchState !== MatchState.FULL_TIME && (
             <>
                <button
                onClick={onStartPause}
                disabled={buttonDisabled}
                className={`${buttonClassName} text-white font-bold py-2 px-4 rounded-lg shadow-md w-40 text-center transition-colors`}
                >
                {buttonText}
                </button>

                {showResetHalfButton && (
                <button
                    onClick={onResetHalf}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                    Reiniciar Tiempo
                </button>
                )}
                
                {showEndMatchButton && (
                <button
                    onClick={onEndMatch}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                    Finalizar Partido
                </button>
                )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;