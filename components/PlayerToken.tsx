import React, { useRef, useCallback } from 'react';
import type { Player, TeamId } from '../types';

interface PlayerTokenProps {
  player: Player;
  teamId: TeamId;
  onMove: (position: { x: number; y: number }) => void;
}

const PlayerToken: React.FC<PlayerTokenProps> = ({ player, teamId, onMove }) => {
  const tokenRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDragging.current || !tokenRef.current) return;

      moveEvent.preventDefault();

      const parentRect = tokenRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const touch = 'touches' in moveEvent ? moveEvent.touches[0] : null;
      const clientX = touch ? touch.clientX : (moveEvent as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (moveEvent as MouseEvent).clientY;

      if (clientX === undefined || clientY === undefined) return;

      let x = clientX - parentRect.left;
      let y = clientY - parentRect.top;

      let xPercent = Math.max(0, Math.min(100, (x / parentRect.width) * 100));
      let yPercent = Math.max(0, Math.min(100, (y / parentRect.height) * 100));

      onMove({ x: xPercent, y: yPercent });
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  }, [onMove]);
  
  let tokenClass: string;
  if (teamId === 'a') {
    tokenClass = player.isGoalkeeper ? 'home-goalkeeper' : 'home-outfield';
  } else {
    tokenClass = player.isGoalkeeper ? 'visitor-goalkeeper' : 'visitor-outfield';
  }

  return (
    <div
      ref={tokenRef}
      className={`player-token ${tokenClass} pointer-events-auto`}
      style={{
        left: `${player.position.x}%`,
        top: `${player.position.y}%`,
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      title={`${player.name} - ${player.positionName}`}
    >
      <div className="flex flex-col items-center justify-center text-xs leading-tight">
        <span className="font-bold">{player.number}</span>
        <span className="font-medium opacity-80">{player.positionAbbr}</span>
      </div>
    </div>
  );
};

export default PlayerToken;