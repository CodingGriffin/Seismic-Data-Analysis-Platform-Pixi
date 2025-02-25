import React from 'react';

interface TooltipProps {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ x, y, content, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="absolute bg-white px-2 py-1 text-sm border rounded shadow-sm z-10"
      style={{
        left: `${x + 10}px`,
        top: `${y - 30}px`,
        pointerEvents: 'none'
      }}
    >
      {content}
    </div>
  );
};