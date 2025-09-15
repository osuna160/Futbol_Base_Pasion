import React, { useState, useRef, useCallback } from 'react';
import type { Team, TeamId } from '../types';
import PlayerToken from './PlayerToken';
import { FORMATIONS } from '../constants';
import { BallIcon, FootballFieldSVG } from './icons';
import BallToken from './BallToken';

interface FormationsProps {
  teamA: Team;
  teamB: Team;
  onPlayerMove: (teamId: TeamId, playerId: number, position: { x: number; y: number }) => void;
  onFormationChange: (teamId: TeamId, formation: string) => void;
}

const FormationSelect: React.FC<{label: string, teamName: string, teamId: TeamId, formation: string, onFormationChange: (teamId: TeamId, formation: string) => void, colorClass: string}> = ({label, teamName, teamId, formation, onFormationChange, colorClass}) => (
    <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
        <label htmlFor={`formation-${teamId}`} className={`font-semibold ${colorClass} truncate`}>{teamName}:</label>
        <div className="relative">
            <select
                id={`formation-${teamId}`}
                value={formation}
                onChange={(e) => onFormationChange(teamId, e.target.value)}
                className="bg-gray-700 text-white font-semibold py-2 pl-3 pr-8 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                aria-label={label}
            >
                {Object.keys(FORMATIONS).map(formationKey => (
                <option key={formationKey} value={formationKey}>{formationKey}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    </div>
);

const Formations: React.FC<FormationsProps> = ({ teamA, teamB, onPlayerMove, onFormationChange }) => {
  const [showBall, setShowBall] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Tactical Board State
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<{ id: number; color: string; points: string; }[]>([]);
  const [currentPath, setCurrentPath] = useState<{ color: string; points: string; } | null>(null);
  const [drawColor, setDrawColor] = useState('#ffdd00');
  const isPathDrawing = useRef(false);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top,
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    isPathDrawing.current = true;
    const coords = getCoords(e);
    if (coords) {
        setCurrentPath({ color: drawColor, points: `M ${coords.x} ${coords.y}` });
    }
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isPathDrawing.current || !currentPath) return;
    e.preventDefault();
    const coords = getCoords(e);
    if (coords) {
        setCurrentPath(prev => prev ? { ...prev, points: `${prev.points} L ${coords.x} ${coords.y}` } : null);
    }
  };

  const handleDrawEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isPathDrawing.current) return;
    e.preventDefault();
    isPathDrawing.current = false;
    if (currentPath && currentPath.points.includes("L")) { // only save if it's more than a dot
        setPaths(prev => [...prev, { id: Date.now(), ...currentPath }]);
    }
    setCurrentPath(null);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
       <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowBall(!showBall)}
                    title="Añadir/Quitar Balón"
                    className={`p-2 rounded-md ${showBall ? 'bg-cyan-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'} transition-colors`}
                >
                    <BallIcon />
                </button>
                <button
                    onClick={() => setIsDrawing(!isDrawing)}
                    title={isDrawing ? "Modo Mover" : "Modo Dibujo"}
                    className={`p-2 rounded-md ${isDrawing ? 'bg-yellow-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'} transition-colors`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
                {isDrawing && (
                    <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
                        <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer" title="Seleccionar Color" />
                        <button onClick={() => setPaths([])} className="p-2 text-gray-300 hover:text-white" title="Limpiar Pizarra">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
         <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto sm:justify-end">
            <FormationSelect label="Formación Local" teamName={teamA.name} teamId="a" formation={teamA.formation} onFormationChange={onFormationChange} colorClass="text-blue-400" />
            <FormationSelect label="Formación Visitante" teamName={teamB.name} teamId="b" formation={teamB.formation} onFormationChange={onFormationChange} colorClass="text-pink-400" />
         </div>
      </div>
      
      <div 
        ref={containerRef} 
        className={`formation-container ${isDrawing ? 'drawing-mode' : ''}`}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
      >
        <FootballFieldSVG />

        <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 5, pointerEvents: 'none' }}>
            {paths.map(path => (
                <path key={path.id} d={path.points} stroke={path.color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {currentPath && (
                <path d={currentPath.points} stroke={currentPath.color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
        </svg>

        <div className={`absolute top-0 left-0 w-full h-full z-10 ${isDrawing ? 'pointer-events-none' : ''}`}>
          {teamA.starters.filter(p => !p.isSentOff).map(player => (
            <PlayerToken key={`a-${player.id}`} player={player} teamId='a' onMove={(pos) => onPlayerMove('a', player.id, pos)} />
          ))}
          {teamB.starters.filter(p => !p.isSentOff).map(player => (
            <PlayerToken key={`b-${player.id}`} player={{...player, position: { x: 100 - player.position.x, y: player.position.y }}} teamId='b' onMove={(visPos) => onPlayerMove('b', player.id, { x: 100 - visPos.x, y: visPos.y })} />
          ))}
          {showBall && <BallToken position={ballPosition} onMove={setBallPosition} />}
        </div>
      </div>
    </div>
  );
};

export default Formations;