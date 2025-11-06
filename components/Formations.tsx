import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Team, TeamId } from '../types';
import PlayerToken from './PlayerToken';
import { FORMATIONS } from '../constants';
import { BallIcon, FootballFieldSVG, TrashIcon, PencilIcon, LineIcon, ArrowUpRightIcon, CursorArrowRaysIcon, EyeIcon, EyeSlashIcon, DashedLineIcon, DottedLineIcon, EraserIcon, PaintBrushIcon, CurveIcon } from './icons';
import BallToken from './BallToken';

interface FormationsProps {
  teamA: Team;
  teamB: Team;
  onPlayerMove: (teamId: TeamId, playerId: number, position: { x: number; y: number }) => void;
  onFormationChange: (teamId: TeamId, formation: string) => void;
}

type LineStyle = 'solid' | 'dashed' | 'dotted';
type DrawMode = 'move' | 'freehand' | 'line' | 'arrow' | 'erase' | 'curve';

const Formations: React.FC<FormationsProps> = ({ teamA, teamB, onPlayerMove, onFormationChange }) => {
  const [showBall, setShowBall] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Tactical Board State
  const [paths, setPaths] = useState<{ id: number; color: string; points: string; type: 'freehand' | 'line' | 'arrow' | 'curve', lineStyle: LineStyle }[]>([]);
  const [drawColor, setDrawColor] = useState('#ffdd00');
  const [showTeamA, setShowTeamA] = useState(true);
  const [showTeamB, setShowTeamB] = useState(true);
  const [drawMode, setDrawMode] = useState<DrawMode>('move');
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [curveFactor, setCurveFactor] = useState(0.2);
  
  // For drawing logic
  const isDrawing = useRef(false);
  const currentDrawingPath = useRef<{ color: string; points: string; type: 'freehand' | 'line' | 'arrow' | 'curve'; startPoint: {x:number, y:number}; lineStyle: LineStyle } | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);


  const selectDrawMode = (mode: DrawMode) => {
    setDrawMode(mode);
    isDrawing.current = false;
    currentDrawingPath.current = null;
    setPreviewPath(null);
  };

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    
    const touch = 'touches' in e ? (e.touches[0] || e.changedTouches[0]) : null;

    if (!touch && !('clientX' in e)) {
        return null;
    }

    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    
    return {
        x: (clientX - rect.left) / rect.width * 105, // Scale to SVG viewbox width
        y: (clientY - rect.top) / rect.height * 68, // Scale to SVG viewbox height
    };
  }, []);

  const handleDrawStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (drawMode === 'move' || drawMode === 'erase' || ('button' in e && e.button !== 0)) return;
    
    // Check if the target is the SVG background, not a player token
    const target = e.target as HTMLElement;
    if (!target.closest('.formation-container') && !target.closest('svg')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCoords(e);
    if (!coords) return;

    isDrawing.current = true;
    
    const commonPathData = {
        color: drawColor,
        points: `M ${coords.x} ${coords.y}`,
        startPoint: coords,
        lineStyle: lineStyle,
    };

    if (drawMode === 'freehand') {
        currentDrawingPath.current = {
            ...commonPathData,
            type: 'freehand',
        };
        setPreviewPath(currentDrawingPath.current.points);
    } else { // 'line', 'arrow', or 'curve'
        currentDrawingPath.current = {
            ...commonPathData,
            points: '', // Will be set on move/end
            type: drawMode,
        };
        const d = `M ${coords.x} ${coords.y} L ${coords.x} ${coords.y}`;
        setPreviewPath(d);
    }
  }, [drawMode, drawColor, lineStyle, getCoords]);

  const handleDrawMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !currentDrawingPath.current) return;
    e.preventDefault();
    
    const coords = getCoords(e);
    if (!coords) return;
    
    if (drawMode === 'freehand') {
        const newPoints = `${currentDrawingPath.current.points} L ${coords.x} ${coords.y}`;
        currentDrawingPath.current.points = newPoints;
        setPreviewPath(newPoints);
    } else if (drawMode === 'curve') {
        const start = currentDrawingPath.current.startPoint;
        const end = coords;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const controlX = midX - dy * curveFactor; 
        const controlY = midY + dx * curveFactor;
        const d = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
        setPreviewPath(d);
    } else { // 'line' or 'arrow'
        const d = `M ${currentDrawingPath.current.startPoint.x} ${currentDrawingPath.current.startPoint.y} L ${coords.x} ${coords.y}`;
        setPreviewPath(d);
    }
  }, [drawMode, getCoords, curveFactor]);

  const handleDrawEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !currentDrawingPath.current) return;
    
    const pathToEnd = currentDrawingPath.current;
    isDrawing.current = false;
    currentDrawingPath.current = null;
    setPreviewPath(null);
    
    e.preventDefault();
    
    const endCoords = getCoords(e);
    if (!endCoords) return;
    
    const start = pathToEnd.startPoint;
    const movedEnough = Math.hypot(endCoords.x - start.x, endCoords.y - start.y) > 0.5;

    if (movedEnough) {
        let finalPath: string;
        if (pathToEnd.type === 'freehand') {
            finalPath = pathToEnd.points;
        } else if (pathToEnd.type === 'curve') {
            const end = endCoords;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const controlX = midX - dy * curveFactor;
            const controlY = midY + dx * curveFactor;
            finalPath = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
        } else {
            finalPath = `M ${start.x} ${start.y} L ${endCoords.x} ${endCoords.y}`;
        }

        setPaths(prev => [...prev, {
            id: Date.now(),
            color: pathToEnd.color,
            points: finalPath,
            type: pathToEnd.type,
            lineStyle: pathToEnd.lineStyle,
        }]);
    }
  }, [getCoords, curveFactor]);

  const handlePathClick = useCallback((id: number) => {
    if (drawMode === 'erase') {
        setPaths(prev => prev.filter(p => p.id !== id));
    }
  }, [drawMode]);
  
  const DrawToolButton: React.FC<{ title: string; mode: DrawMode; children: React.ReactNode }> = ({ title, mode, children }) => (
    <button
        title={title}
        onClick={() => selectDrawMode(mode)}
        className={`tool-button ${drawMode === mode ? 'active' : ''}`}
    >
        {children}
    </button>
  );

  const LineStyleButton: React.FC<{ title: string; style: LineStyle; children: React.ReactNode }> = ({ title, style, children }) => (
    <button
        title={title}
        onClick={() => setLineStyle(style)}
        className={`tool-button ${lineStyle === style ? 'active' : ''}`}
    >
        {children}
    </button>
  );
  
  const getDashArray = (style: LineStyle) => {
    switch (style) {
        case 'dashed': return '4, 4';
        case 'dotted': return '0.5, 3';
        case 'solid':
        default: return undefined;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
        <div className="flex justify-center items-center gap-2 p-2 bg-gray-900/50 rounded-lg flex-wrap mb-4">
            {/* Draw Mode Group */}
            <div className="flex items-center gap-1 p-1 bg-gray-700/50 rounded-lg">
                <DrawToolButton title="Mover Fichas" mode="move"><CursorArrowRaysIcon /></DrawToolButton>
                <DrawToolButton title="Dibujo Libre" mode="freehand"><PencilIcon /></DrawToolButton>
                <DrawToolButton title="Línea Recta" mode="line"><LineIcon /></DrawToolButton>
                <DrawToolButton title="Línea Curva" mode="curve"><CurveIcon /></DrawToolButton>
                <DrawToolButton title="Flecha" mode="arrow"><ArrowUpRightIcon /></DrawToolButton>
                <DrawToolButton title="Borrar Línea" mode="erase"><EraserIcon /></DrawToolButton>
            </div>
            {/* Line Style Group */}
            <div className="flex items-center gap-1 p-1 bg-gray-700/50 rounded-lg">
                <LineStyleButton title="Línea Sólida" style="solid"><LineIcon /></LineStyleButton>
                <LineStyleButton title="Línea Discontinua" style="dashed"><DashedLineIcon /></LineStyleButton>
                <LineStyleButton title="Línea de Puntos" style="dotted"><DottedLineIcon /></LineStyleButton>
            </div>
            {/* Curve Adjuster */}
            {drawMode === 'curve' && (
                <div className="flex items-center gap-2 p-1 bg-gray-700/50 rounded-lg" title="Ajustar Curvatura">
                    <span className="text-xs font-semibold">Curva</span>
                    <input
                        type="range"
                        min="-0.5"
                        max="0.5"
                        step="0.05"
                        value={curveFactor}
                        onChange={e => setCurveFactor(parseFloat(e.target.value))}
                        className="w-24"
                    />
                </div>
            )}
            {/* Board Controls Group */}
            <div className="flex items-center gap-1 p-1 bg-gray-700/50 rounded-lg">
                <div className="tool-button color-picker-wrapper" title="Seleccionar Color">
                    <PaintBrushIcon style={{ color: drawColor }} />
                    <input
                        type="color"
                        value={drawColor}
                        onChange={e => setDrawColor(e.target.value)}
                        className="color-picker-input"
                    />
                </div>
                <button onClick={() => setPaths([])} className="tool-button" title="Limpiar todo el dibujo">
                    <TrashIcon />
                </button>
                <button onClick={() => setShowBall(!showBall)} title="Añadir/Quitar Balón" className={`tool-button ${showBall ? 'active' : ''}`}>
                    <BallIcon />
                </button>
            </div>
        </div>
      
        <div className="flex flex-col md:flex-row justify-around items-center mb-4 gap-4">
            <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowTeamA(!showTeamA)} title={showTeamA ? 'Ocultar Equipo Local' : 'Mostrar Equipo Local'} className="tool-button">
                        {showTeamA ? <EyeIcon /> : <EyeSlashIcon />}
                    </button>
                    <h3 className="font-semibold text-blue-400 text-lg">{teamA.name}</h3>
                </div>
                <select
                    value={teamA.formation}
                    onChange={(e) => onFormationChange('a', e.target.value)}
                    className="bg-gray-700 text-white font-semibold py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                    {Object.keys(FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
            <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-pink-400 text-lg">{teamB.name}</h3>
                    <button onClick={() => setShowTeamB(!showTeamB)} title={showTeamB ? 'Ocultar Equipo Visitante' : 'Mostrar Equipo Visitante'} className="tool-button">
                        {showTeamB ? <EyeIcon /> : <EyeSlashIcon />}
                    </button>
                </div>
                <select
                    value={teamB.formation}
                    onChange={(e) => onFormationChange('b', e.target.value)}
                    className="bg-gray-700 text-white font-semibold py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                    {Object.keys(FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
        </div>
      
      <div 
        ref={containerRef} 
        className={`formation-container ${drawMode !== 'move' ? 'drawing-mode' : ''}`}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
      >
          <FootballFieldSVG />

          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 105 68" preserveAspectRatio="none" style={{ zIndex: 5, pointerEvents: drawMode === 'erase' ? 'auto' : 'none' }}>
              <defs>
                  <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" stroke="none" />
                  </marker>
              </defs>
              {paths.map(path => (
                  <g 
                      key={path.id} 
                      onClick={() => handlePathClick(path.id)} 
                      style={{ cursor: drawMode === 'erase' ? 'pointer' : 'default' }}
                  >
                      <path 
                          d={path.points} 
                          stroke="transparent"
                          strokeWidth="4"
                          fill="none" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                      />
                      <path 
                          d={path.points} 
                          strokeWidth="0.6"
                          fill="none" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeDasharray={getDashArray(path.lineStyle)}
                          markerEnd={path.type === 'arrow' ? 'url(#arrowhead)' : undefined} 
                          style={{ stroke: path.color, color: path.color, pointerEvents: 'none' }}
                      />
                  </g>
              ))}
              {previewPath && (
                  <path 
                  d={previewPath} 
                  strokeWidth="0.6" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeDasharray={getDashArray(lineStyle)} 
                  markerEnd={drawMode === 'arrow' || drawMode === 'curve' ? 'url(#arrowhead)' : undefined} 
                  style={{ stroke: drawColor, color: drawColor, opacity: 0.8, pointerEvents: 'none' }} 
                  />
              )}
          </svg>

          {showTeamA && teamA.starters.filter(p => !p.isSentOff).map(player => (
          <PlayerToken key={`a-${player.id}`} player={player} teamId='a' onMove={(pos) => onPlayerMove('a', player.id, pos)} />
          ))}
          {showTeamB && teamB.starters.filter(p => !p.isSentOff).map(player => (
          <PlayerToken key={`b-${player.id}`} player={{...player, position: { x: 100 - player.position.x, y: 100 - player.position.y }}} teamId='b' onMove={(visPos) => onPlayerMove('b', player.id, { x: 100 - visPos.x, y: 100 - visPos.y })} />
          ))}
          {showBall && <BallToken position={ballPosition} onMove={setBallPosition} />}
      </div>
    </div>
  );
};

export default Formations;