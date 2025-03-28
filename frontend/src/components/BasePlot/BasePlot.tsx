import { Application } from "@pixi/react";
import { ReactNode, useEffect, useState, forwardRef, useCallback, useMemo } from "react";
import { Tooltip } from "../ToolTip/ToolTip";

interface BasePlotProps {
  children: ReactNode;
  xLabel?: string;
  yLabel?: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  display?: (value:number) => string;
  tooltipContent?: string;
  axesSwapped?: boolean;
  xAxisReversed?: boolean;
  yAxisReversed?: boolean;
  onPointerMove?: (event: React.PointerEvent) => void;
  onPointerUp?: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onDimensionChange?: (dimensions: { width: number; height: number }) => void;
  forceWidth?: number;
  forceHeight?: number;
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
  forceWidth,
  forceHeight,
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
    if (forceWidth && forceHeight) {
      setPlotDimensions({
        width: forceWidth,
        height: forceHeight
      });
      return;
    }
    
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
  }, [ref, plotDimensions.width, plotDimensions.height, forceWidth, forceHeight]);

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
      className="position-relative border bg-white shadow-sm w-100 h-100 min-vh-50"
    >
      <div className="position-absolute start-0 top-50 translate-middle-y text-rotate-270 small ms-n4">
        
      </div>
      <div className="position-absolute start-0 top-0 h-100 translate-middle-x d-flex flex-column justify-content-between ms-n3">
        <div className="small">{displayedValues.yMax !== undefined && display ? display(displayedValues.yMax) : ''}</div>
        <div className="small">{displayedValues.yLabel}</div>
        <div className="small">{displayedValues.yMin !== undefined && display ? display(displayedValues.yMin) : ''}</div>
      </div>
      <div className="position-absolute w-100 d-flex justify-content-between mb-n2" style={{bottom:'-10px'}}>
        <div className="small">{displayedValues.xMin !== undefined && display ? display(displayedValues.xMin) : ''}</div>
        <div className="small">{displayedValues.xLabel}</div>
        <div className="small">{displayedValues.xMax !== undefined && display ? display(displayedValues.xMax) : ''}</div>
      </div>
      <div 
        className="w-100 h-100 d-flex"
        onPointerMove={handlePointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onPointerDown}
        ref={ref}
      >
        {ref && 'current' in ref && ref.current && (
          <Application
            className="flex-1"
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
