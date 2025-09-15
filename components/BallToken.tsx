
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

    const getEventCoords = (e: MouseEvent | TouchEvent) => {
      return 'touches' in e ? e.touches[0] : e;
    };

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDragging.current || !tokenRef.current) return;

      moveEvent.preventDefault();

      const parentRect = tokenRef.current.parentElement?.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const { clientX, clientY } = getEventCoords(moveEvent);

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
      className="absolute transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 cursor-grab active:cursor-grabbing pointer-events-auto"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: 30, // Higher than player tokens
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      title="Balón"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-full h-full drop-shadow-lg">
        <path fill="#000000" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" />
        <path fill="#FFFFFF" d="M164.6 135.4l56.8 56.8c4.2-1.8 8.8-2.9 13.5-3.4l-57.8-57.8c-5.8-5.8-15.3-5.8-21.1 0l-1.4 1.4c-5.8 5.8-5.8 15.3 0 21.1zm21.1 88.5l-56.8-56.8c1.8-4.2 2.9-8.8 3.4-13.5l57.8 57.8c5.8 5.8 5.8 15.3 0 21.1l-1.4 1.4c-5.8 5.8-15.3 5.8-21.1 0zM224 336l-57.8 57.8c5.8 5.8 15.3 5.8 21.1 0l1.4-1.4c5.8-5.8 5.8-15.3 0-21.1l-56.8-56.8c-4.2 1.8-8.8 2.9-13.5 3.4l57.8 57.8c4.6 4.6 11.2 6.4 17.5 5.7zM240 256c-4.4 0-8.8.5-13.1 1.4l-102-102c-5.8-5.8-15.3-5.8-21.1 0l-1.4 1.4c-5.8 5.8-5.8 15.3 0 21.1l102 102c-1 4.3-1.4 8.7-1.4 13.1c0 4.4.5 8.8 1.4 13.1l-102 102c-5.8 5.8-5.8 15.3 0 21.1l1.4 1.4c5.8 5.8 15.3 5.8 21.1 0l102-102c4.3 1 8.7 1.4 13.1 1.4c4.4 0 8.8-.5 13.1-1.4l102 102c5.8 5.8 15.3 5.8 21.1 0l1.4-1.4c5.8-5.8 5.8-15.3 0-21.1l-102-102c1-4.3 1.4-8.7 1.4-13.1c0-4.4-.5-8.8-1.4-13.1l102-102c5.8-5.8 5.8-15.3 0-21.1l-1.4-1.4c-5.8-5.8-15.3-5.8-21.1 0l-102 102c-4.3-1-8.7-1.4-13.1-1.4zM405.4 164.6l-56.8-56.8c-5.8-5.8-15.3-5.8-21.1 0l-1.4 1.4c-5.8 5.8-5.8 15.3 0 21.1l56.8 56.8c4.2-1.8 8.8-2.9 13.5-3.4l-57.8-57.8c5.8 5.8 15.3 5.8 21.1 0l1.4-1.4c5.8-5.9 5.8-15.4 0-21.2zM288 336l57.8 57.8c-5.8 5.8-15.3 5.8-21.1 0l-1.4-1.4c-5.8-5.8-5.8-15.3 0-21.1l56.8-56.8c4.2 1.8 8.8 2.9 13.5 3.4l-57.8 57.8c-4.6 4.6-11.2 6.4-17.5 5.7zm31.4-96.6l56.8 56.8c-1.8 4.2-2.9 8.8-3.4 13.5l-57.8-57.8c-5.8-5.8-5.8-15.3 0-21.1l1.4-1.4c5.8-5.8 15.3-5.8 21.1 0z" />
      </svg>
    </div>
  );
};

export default BallToken;