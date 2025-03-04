import { Application } from "@pixi/react";
import { ReactNode, useEffect, useState, forwardRef, useCallback, useMemo } from "react";
import { Tooltip } from './ToolTip';

interface BasePlotProps {
  children: ReactNode;
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  display: (value:number) => string;
  tooltipContent?: string;
  axesSwapped?: boolean;
  xAxisReversed?: boolean;
  yAxisReversed?: boolean;
  onPointerMove?: (event: React.PointerEvent) => void;
  onPointerUp?: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onDimensionChange?: (dimensions: { width: number; height: number }) => void;
}

export const BasePlot = forwardRef<HTMLDivElement, BasePlotProps>(({
  children,
  xLabel,
  yLabel,
  xMin,
  xMax,
  yMin,
  yMax,
  display,
  tooltipContent,
  onPointerMove,
  onPointerUp,
  onPointerDown,
  onDimensionChange,
  axesSwapped = false,
  xAxisReversed = false,
  yAxisReversed = false,
}, ref) => {
  const [plotDimensions, setPlotDimensions] = useState({
    width: 640,
    height: 480,
  });

  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!ref || !('current' in ref) || !ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setCursorPosition({ x, y });
    if (onPointerMove) {
      onPointerMove(event);
    }
  }, [ref, onPointerMove]);

  const updateDimensions = useCallback(() => {
    if (ref && 'current' in ref && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const newDimensions = {
        width: rect.width,
        height: rect.height,
      };
      
      if (newDimensions.width !== plotDimensions.width || 
          newDimensions.height !== plotDimensions.height) {
        setPlotDimensions(newDimensions);
      }
    }
  }, [ref, plotDimensions.width, plotDimensions.height]);

  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (ref && 'current' in ref && ref.current) {
      resizeObserver.observe(ref.current);
    }

    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [ref, updateDimensions]);

  useEffect(() => {
    console.log("Canvas Rerendered")
  }, []);

  useEffect(() => {
    if (onDimensionChange) {
      onDimensionChange(plotDimensions);
    }
  }, [plotDimensions, onDimensionChange]);

  // Calculate displayed axis values and labels using memoized callbacks
  const getDisplayedXLabel = useCallback(() => {
    return axesSwapped ? yLabel : xLabel;
  }, [axesSwapped, xLabel, yLabel]);

  const getDisplayedYLabel = useCallback(() => {
    return axesSwapped ? xLabel : yLabel;
  }, [axesSwapped, xLabel, yLabel]);

  const getDisplayedXMin = useCallback(() => {
    if (axesSwapped) {
      return yAxisReversed ? yMax : yMin;
    } else {
      return xAxisReversed ? xMax : xMin;
    }
  }, [axesSwapped, xMin, xMax, yMin, yMax, xAxisReversed, yAxisReversed]);

  const getDisplayedXMax = useCallback(() => {
    if (axesSwapped) {
      return yAxisReversed ? yMin : yMax;
    } else {
      return xAxisReversed ? xMin : xMax;
    }
  }, [axesSwapped, xMin, xMax, yMin, yMax, xAxisReversed, yAxisReversed]);

  const getDisplayedYMin = useCallback(() => {
    if (axesSwapped) {
      return xAxisReversed ? xMax : xMin;
    } else {
      return yAxisReversed ? yMax : yMin;
    }
  }, [axesSwapped, xMin, xMax, yMin, yMax, xAxisReversed, yAxisReversed]);

  const getDisplayedYMax = useCallback(() => {
    if (axesSwapped) {
      return xAxisReversed ? xMin : xMax;
    } else {
      return yAxisReversed ? yMin : yMax;
    }
  }, [axesSwapped, xMin, xMax, yMin, yMax, xAxisReversed, yAxisReversed]);

  // Memoize the final values to avoid recalculation on every render
  const displayedValues = useMemo(() => ({
    xLabel: getDisplayedXLabel(),
    yLabel: getDisplayedYLabel(),
    xMin: getDisplayedXMin(),
    xMax: getDisplayedXMax(),
    yMin: getDisplayedYMin(),
    yMax: getDisplayedYMax()
  }), [
    getDisplayedXLabel, getDisplayedYLabel,
    getDisplayedXMin, getDisplayedXMax,
    getDisplayedYMin, getDisplayedYMax
  ]);

  return (
    <div
      className="relative border border-gray-200 rounded-lg bg-white shadow-sm w-full h-full min-h-[300px]"
    >
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-sm">
        {displayedValues.yLabel}
      </div>
      <div className="absolute -left-8 top-0 h-full flex flex-col justify-between">
        <div className="text-xs">{display(displayedValues.yMax)}</div>
        <div className="text-xs">{display(displayedValues.yMin)}</div>
      </div>

      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm">
        {displayedValues.xLabel}
      </div>
      <div className="absolute -bottom-6 left-0 w-full flex justify-between">
        <div className="text-xs">{display(displayedValues.xMin)}</div>
        <div className="text-xs">{display(displayedValues.xMax)}</div>
      </div>
      <div className="w-full h-full"
        onPointerMove={handlePointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onPointerDown}
        ref={ref}
      >
        {ref && 'current' in ref && ref.current && (
          <Application
            className="w-full h-full"
            width={plotDimensions.width}
            height={plotDimensions.height}
            background="white"
            resizeTo={ref.current}
            autoDensity={true}
            resolution={window.devicePixelRatio || 1}
          >
            {children}
          </Application>
        )}

        <Tooltip
          x={cursorPosition?.x ?? 0}
          y={cursorPosition?.y ?? 0}
          content={tooltipContent ?? ''}
          visible={!!cursorPosition && !!tooltipContent}
        />
      </div>
    </div>
  );
});
