import React, { useRef, useCallback } from 'react';

interface BallTokenProps {
  position: { x: number; y: number };
  onMove: (position: { x: number; y: number }) => void;
}

const BallToken: React.FC<BallTokenProps> = ({ position, onMove }) => {
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

  return (
    <div
      ref={tokenRef}
      className="absolute w-7 h-7 cursor-grab active:cursor-grabbing pointer-events-auto ball-token-glow"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: 30, // Higher than player tokens
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      title="Balón"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" className="w-full h-full">
        <circle cx="25" cy="25" r="24.5" fill="#fff" stroke="#000" strokeWidth="0.5"/>
        <polygon fill="#000" points="25,4.2 29.3,12.1 20.7,12.1"/>
        <polygon fill="#000" points="13.2,14.6 18.2,16.4 15.2,21.8"/>
        <polygon fill="#000" points="36.8,14.6 34.8,21.8 31.8,16.4"/>
        <polygon fill="#000" points="13.2,35.4 15.2,28.2 18.2,33.6"/>
        <polygon fill="#000" points="36.8,35.4 31.8,33.6 34.8,28.2"/>
        <polygon fill="#000" points="25,45.8 20.7,37.9 29.3,37.9"/>
        <path fill="none" stroke="#000" strokeWidth="0.7" d="M25,4.2 36.8,14.6 31.8,33.6 18.2,33.6 13.2,14.6 25,4.2z M20.7,12.1 13.2,14.6 15.2,21.8 25,25 20.7,12.1z M29.3,12.1 25,25 34.8,21.8 36.8,14.6 29.3,12.1z M20.7,37.9 18.2,33.6 15.2,28.2 25,25 20.7,37.9z M29.3,37.9 25,25 34.8,28.2 31.8,33.6 29.3,37.9z M13.2,35.4 18.2,33.6 M36.8,35.4 31.8,33.6 M25,45.8 29.3,37.9 M25,45.8 20.7,37.9"/>
      </svg>
    </div>
  );
};

export default BallToken;