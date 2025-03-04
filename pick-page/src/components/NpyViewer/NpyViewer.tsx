import { Container, Sprite, Graphics, Text, Texture } from "pixi.js";
import { useCallback, useRef, useEffect, useState } from "react";
import { extend } from "@pixi/react";
import { useNpyViewer, COLOR_MAPS, type ColorMapKey, getColorFromMap } from '../../context/NpyViewerContext';
import { BasePlot } from '../controls/BasePlot';
import { FileInput } from './FileInput';

extend({ Container, Sprite, Graphics, Text });

export function NpyViewer() {
  const {
    state,
    addPoint,
    updatePoint,
    removePoint,
    setHoveredPoint,
    setIsDragging,
    setDraggedPoint,
    calculateDisplayValues,
    setColorMap,
    setImageTransform,
    setAxisLimits,
    loadNpyFile,
  } = useNpyViewer();

  const {
    textureData,
    error,
    isLoading,
    points,
    hoveredPoint,
    isDragging,
    draggedPoint,
    selectedColorMap,
    imageTransform,
    axisLimits,
    originalData,
  } = state;

  const lastFileRef = useRef<File | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [texture, setTexture] = useState<Texture | null>(null);

  // Add transform function that works with stored data
  const createTexture = (
    transformedData: Float32Array, 
    dimensions: { width: number; height: number },
    dataRange: { min: number; max: number },
    colorMap: string[]
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext("2d")!;

    const rgba = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    
    for (let i = 0; i < transformedData.length; i++) {
      const normalizedValue = (transformedData[i] - dataRange.min) / (dataRange.max - dataRange.min);
      const color = getColorFromMap(normalizedValue, colorMap);
      const idx = i * 4;
      rgba[idx] = color.r;
      rgba[idx + 1] = color.g;
      rgba[idx + 2] = color.b;
      rgba[idx + 3] = 255;
    }

    const imgData = new ImageData(rgba, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);

    const texture = Texture.from(canvas);
    canvas.remove();
    return texture;
  };

  // Add helper function to clamp coordinates
  const clampCoordinates = (x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(800, x)),  // Clamp x between 0 and 800
      y: Math.max(0, Math.min(400, y))   // Clamp y between 0 and 400
    };
  };

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (!texture) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Add new point with Shift first, regardless of hover state
    if (event.shiftKey) {
      const { axisX, axisY } = calculateDisplayValues(x, y);
      const newPoint = { x, y, value: 0, axisX, axisY, color: 0xFF0000 };
      addPoint(newPoint);
      return;
    }

    // Check for existing point for other interactions
    const clickedPoint = points.find(point => {
      const dx = point.x - x;
      const dy = point.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 10;
    });

    if (clickedPoint) {
      if (event.altKey) {
        // Remove point
        removePoint(points.indexOf(clickedPoint));
        setHoveredPoint(null);
      } else {
        // Start dragging
        setIsDragging(true);
        setDraggedPoint(clickedPoint);
      }
    }
  }, [texture, points]);


  // Update handlePointerUp to handle both normal and outside cases
  const handlePointerUp = useCallback(() => {
    if (!texture) return;

    // Reset all states
    setIsDragging(false);
    setDraggedPoint(null);
    setHoveredPoint(null);
  }, [texture]);

  // Update handlePointerMove to check isDragging state more strictly
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!texture) return;

    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Only process drag if we're actually in dragging state and have a dragged point
    if (isDragging && draggedPoint && event.buttons > 0) { // Check if button is still pressed
      const { x: clampedX, y: clampedY } = clampCoordinates(x, y);
      const { axisX, axisY } = calculateDisplayValues(clampedX, clampedY);
      const updatedPoint = {
        ...draggedPoint,
        x: clampedX,
        y: clampedY,
        axisX,
        axisY
      };

      updatePoint(points.indexOf(draggedPoint), updatedPoint);
      setDraggedPoint(updatedPoint);
    } else {
      // If not dragging, handle hover
      const { x: clampedX, y: clampedY } = clampCoordinates(x, y);
      const hoveredPoint = points.find(point => {
        const dx = point.x - clampedX;
        const dy = point.y - clampedY;
        return Math.sqrt(dx * dx + dy * dy) < 10;
      });
      setHoveredPoint(hoveredPoint || null);

      // If we were dragging but button is no longer pressed, reset drag state
      if (isDragging && event.buttons === 0) {
        setIsDragging(false);
        setDraggedPoint(null);
      }
    }
  }, [texture, isDragging, draggedPoint, points]);

  // Update handleFileSelect to store original data
  const handleFileSelect = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    dataType: 'frequency' | 'slowness' | 'data'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    lastFileRef.current = file;
    await loadNpyFile(file, dataType);
  }, [loadNpyFile]);

  // Update handleAxisLimitChange to handle immediate updates
  const handleAxisLimitChange = (
    axis: "xmin" | "xmax" | "ymin" | "ymax",
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newLimits = { ...state.axisLimits, [axis]: numValue };
      if (newLimits.xmin >= newLimits.xmax || newLimits.ymin >= newLimits.ymax) {
        return; // Don't update if invalid
      }
      setAxisLimits(newLimits);
    }
  };

  
  // Add download function
  const handleDownloadPoints = useCallback(() => {
    // Sort points by x-axis value and format with display values
    const pointsData = points
      .map(point => {
        const { axisX, axisY } = calculateDisplayValues(point.x, point.y);
        return { axisX, axisY };
      })
      .sort((a, b) => a.axisX - b.axisX)  // Sort in descending order (right to left)
      .map(point => `${point.axisX.toFixed(3)}, ${point.axisY.toFixed(3)}`)
      .join('\n');

    // Create blob and download link
    const blob = new Blob([pointsData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plotted_points.txt';

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [points, calculateDisplayValues]);

    // Add this useEffect for global pointer up handling
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      // Reset all states when pointer is released anywhere
      setIsDragging(false);
      setDraggedPoint(null);
      setHoveredPoint(null);
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, []);
  
  useEffect(() => {
    // Create the texture with the current color map
    if (!textureData || !originalData) return;
    const texture = createTexture(
      textureData.transformed,
      textureData.dimensions,
      { min: originalData.min, max: originalData.max },
      [...COLOR_MAPS[state.selectedColorMap]]
    );
    
    setTexture(texture);
  }, [textureData])
  
  // Add window-level pointer up handler using useEffect
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (draggedPoint) {
        const rect = plotRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // Find point at the final position
          const pointAtPosition = points.find(point => {
            const dx = point.x - x;
            const dy = point.y - y;
            return Math.sqrt(dx * dx + dy * dy) < 10;
          });

          setHoveredPoint(pointAtPosition || null);
        }
      }

      setIsDragging(false);
      setDraggedPoint(null);
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [points, draggedPoint]);

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* File Input Section */}
      <div className="w-full max-w-2xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FileInput
            label="Main Data (NPY)"
            onChange={(e) => handleFileSelect(e, 'data')}
          />
          <FileInput
            label="X-Axis Data (NPY)"
            onChange={(e) => handleFileSelect(e, 'frequency')}
          />
          <FileInput
            label="Y-Axis Data (NPY)"
            onChange={(e) => handleFileSelect(e, 'slowness')}
          />
        </div>
        
        {/* Color Map Buttons */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {(Object.keys(COLOR_MAPS) as ColorMapKey[]).map(mapName => (
            <button
              key={mapName}
              onClick={() => setColorMap(mapName)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedColorMap === mapName
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {mapName}
            </button>
          ))}
        </div>
      </div>

      {/* Axis Inputs */}
      <div className="w-full mb-8">
        <div className="min-h-[52px]">
          {texture && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Y Max (Top Left):</label>
                <input
                  type="number"
                  value={axisLimits.ymax}
                  onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                  className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                  step="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Y Min (Bottom Left):</label>
                <input
                  type="number"
                  value={axisLimits.ymin}
                  onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                  className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                  step="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">X Max (Bottom Left):</label>
                <input
                  type="number"
                  value={axisLimits.xmax}
                  onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                  className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                  step="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">X Min (Bottom Right):</label>
                <input
                  type="number"
                  value={axisLimits.xmin}
                  onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
                  className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                  step="1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewer Container */}
      <div className="w-full">
        {texture ? (
          <BasePlot
            ref={plotRef}
            xLabel="Frequency"
            yLabel="Slowness"
            xMin={axisLimits.xmin}
            xMax={axisLimits.xmax}
            yMin={axisLimits.ymin}
            yMax={axisLimits.ymax}
            display={(value) => value.toFixed(3)}
            tooltipContent={hoveredPoint ? 
              `(${calculateDisplayValues(hoveredPoint.x, hoveredPoint.y).axisX.toFixed(3)}, 
                ${calculateDisplayValues(hoveredPoint.x, hoveredPoint.y).axisY.toFixed(3)})` 
              : undefined}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <pixiContainer>
              <pixiSprite
                texture={texture}
                width={800}
                height={400}
              />
              {points.map((point, index) => {
                if (point === draggedPoint || point === hoveredPoint) return null;
                return (
                  <pixiGraphics
                    key={`point-${index}`}
                    draw={g => {
                      g.clear();
                      g.setFillStyle({ color: 0xFF0000 });
                      g.circle(point.x, point.y, 5);
                      g.fill();
                    }}
                  />
                );
              })}
              {(draggedPoint || hoveredPoint) && (
                <pixiGraphics
                  draw={g => {
                    g.clear();
                    const selectedPoint = draggedPoint || hoveredPoint;
                    g.setFillStyle({ color: 0xFF0000 });
                    g.circle(selectedPoint!.x, selectedPoint!.y, 7);
                    g.setFillStyle({ color: 0xFFFFFF, alpha: 0.8 });
                    g.circle(selectedPoint!.x, selectedPoint!.y, 3);
                    g.fill();
                  }}
                />
              )}
            </pixiContainer>
          </BasePlot>
        ) : (
          <div className="w-full aspect-[2/1] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Load an NPY file to view</p>
          </div>
        )}
      </div>

      {/* Transform Controls */}
      {texture && (
        <div className="flex flex-wrap gap-4 justify-center mt-6">
          <button
            onClick={() => {
              setImageTransform({
                rotationCounterClockwise: !state.imageTransform.rotationCounterClockwise,
                rotationClockwise: false
              });
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              imageTransform.rotationCounterClockwise
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Rotate Counter-clockwise
          </button>
          <button
            onClick={() => {
              setImageTransform({
                rotationClockwise: !state.imageTransform.rotationClockwise,
                rotationCounterClockwise: false
              });
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              imageTransform.rotationClockwise
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Rotate Clockwise
          </button>
          <button
            onClick={() => {
              setImageTransform({
                flipHorizontal: !state.imageTransform.flipHorizontal
              });
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              imageTransform.flipHorizontal
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Flip Horizontal
          </button>
          <button
            onClick={() => {
              setImageTransform({flipVertical: !state.imageTransform.flipVertical});
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              imageTransform.flipVertical
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Flip Vertical
          </button>
        </div>
      )}

      {/* Controls Info */}
      <div className="w-full max-w-md mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-center">Controls:</h3>
        <ul className="space-y-1 text-sm text-gray-600 text-center">
          <li>Shift + Click: Add point</li>
          <li>Alt + Click: Remove point</li>
          <li>Hover over points to see coordinates</li>
        </ul>
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleDownloadPoints}
            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={points.length === 0}
          >
            Download Points
          </button>
        </div>
      </div>
    </div>
  );
}
