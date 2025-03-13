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
      className="position-absolute tooltip show"
      style={{
        left: `${x + 10}px`,
        top: `${y - 30}px`,
        pointerEvents: 'none'
      }}
    >
      <div className="tooltip-arrow"></div>
      <div className="tooltip-inner">
        {content}
      </div>
    </div>
  );
};
