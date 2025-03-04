import { Container, Sprite, Texture, Graphics, Text, FederatedPointerEvent } from "pixi.js";
import { useCallback, useRef, useEffect, useState } from "react";
import { Application, extend } from "@pixi/react";
import { useNpyViewer, COLOR_MAPS, type ColorMapKey, getColorFromMap } from '../../context/NpyViewerContext';

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

  // Use the state and functions from context instead of local state
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

  // Add lastFileRef
  const lastFileRef = useRef<File | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Update handlePointerDown to correctly map coordinates
  const handlePointerDown = useCallback((event: FederatedPointerEvent) => {
    if (!texture) return;

    const x = event.global.x;
    const y = event.global.y;

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
  const handlePointerMove = useCallback((event: FederatedPointerEvent) => {
    if (!texture) return;

    const x = event.global.x;
    const y = event.global.y;

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

      // setPoints(prev => prev.map(p => p === draggedPoint ? updatedPoint : p));
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
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileSelect:", event.target.files);
    const file = event.target.files?.[0];
    if (!file) return;
    lastFileRef.current = file;
    await loadNpyFile(file, 'data');
  }, [lastFileRef, loadNpyFile]);

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
        const rect = containerRef.current?.getBoundingClientRect();
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
    <div className="flex flex-col items-center relative">
      {/* File Input - Fixed position */}
      <div className="w-full max-w-xl mb-8">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Data (NPY)
            </label>
            <input
              type="file"
              accept=".npy"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X-Axis Data (NPY)
            </label>
            <input
              type="file"
              accept=".npy"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Y-Axis Data (NPY)
            </label>
            <input
              type="file"
              accept=".npy"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {(Object.keys(COLOR_MAPS) as ColorMapKey[]).map(mapName => (
            <button
              key={mapName}
              onClick={() => {
                setColorMap(mapName);
              }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedColorMap === mapName
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
            >
              {mapName}
            </button>
          ))}
        </div>
      </div>

      {/* Fixed height container for the rest of the content */}
      <div className="h-[600px] flex flex-col items-center">
        {/* Axis Inputs */}
        <div className="h-[52px] mb-8">
          {texture && (
            <div className="flex gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Y Max (Top Left):</label>
                <input
                  type="number"
                  value={axisLimits.ymax}
                  onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                  className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                  step="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Y Min (Bottom Left):</label>
                <input
                  type="number"
                  value={axisLimits.ymin}
                  onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                  className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                  step="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">X Max (Bottom Left):</label>
                <input
                  type="number"
                  value={axisLimits.xmax}
                  onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                  className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                  step="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">X Min (Bottom Right):</label>
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

        {/* Viewer Container */}
        <div>
          {texture ? (
            <div className="relative bg-white p-4 rounded-lg shadow-md">
              {/* Y-axis labels (left side) */}
              <div className="absolute -left-12 top-0 h-full flex flex-col justify-between">
                <div className="text-xs">{axisLimits.ymax.toFixed(3)}</div>
                <div className="text-xs">{axisLimits.ymin.toFixed(3)}</div>
              </div>

              {/* X-axis labels (bottom) */}
              <div className="absolute -bottom-6 left-0 w-full flex justify-between">
                <div className="text-xs">{axisLimits.xmax.toFixed(3)}</div>
                <div className="text-xs">{axisLimits.xmin.toFixed(3)}</div>
              </div>

              {/* Add axis labels */}
              {/* <div className="absolute -left-16 top-1/2 -rotate-90 text-sm font-medium text-gray-600">
                Frequency
              </div> */}
              {/* <div className="absolute bottom-[-2rem] w-full text-center text-sm font-medium text-gray-600">
                Slowness
              </div> */}

              {/* PixiJS Component */}
              <div
                ref={containerRef}
                className="relative border border-gray-200 rounded-lg bg-white shadow-sm"
              >
                <Application
                  width={800}
                  height={400}
                  background="#ffffff"
                >
                  <pixiContainer x={0} y={0}>
                    <pixiSprite
                      texture={texture || undefined}
                      x={0}
                      y={0}
                      width={800}
                      height={400}
                    />

                    {/* Interactive Area */}
                    <pixiGraphics
                      draw={g => {
                        g.clear();
                        g.beginFill(0xFFFFFF, 0);
                        g.drawRect(0, 0, 800, 400);
                        g.endFill();
                      }}
                      eventMode="static"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerUpOutside={handlePointerUp}
                    />

                    {/* Points Layer */}
                    {/* First render non-selected points */}
                    {points.map((point, index) => {
                      if (point === draggedPoint || point === hoveredPoint) return null;
                      return (
                        <pixiGraphics
                          key={`point-${index}`}
                          draw={g => {
                            g.clear();
                            g.beginFill(0xFF0000);
                            g.drawCircle(point.x, point.y, 5);
                            g.endFill();
                          }}
                        />
                      );
                    })}

                    {/* Then render selected point on top */}
                    {(draggedPoint || hoveredPoint) && (
                      <pixiGraphics
                        draw={g => {
                          g.clear();
                          const selectedPoint = draggedPoint || hoveredPoint;
                          g.beginFill(0xFF0000);
                          g.drawCircle(selectedPoint!.x, selectedPoint!.y, 7);
                          g.beginFill(0xFFFFFF, 0.8);
                          g.drawCircle(selectedPoint!.x, selectedPoint!.y, 3);
                          g.endFill();
                        }}
                      />
                    )}
                  </pixiContainer>
                </Application>

                {/* Tooltip */}
                {(hoveredPoint || draggedPoint) && (
                  <div
                    className="absolute bg-white border border-black rounded px-1.5 py-0.5 text-xs shadow-sm pointer-events-none"
                    style={{
                      left: (draggedPoint || hoveredPoint)!.x + 15,
                      top: (draggedPoint || hoveredPoint)!.y - 15,
                      zIndex: 1000
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 border border-black"
                        style={{
                          background: "rgb(255, 0, 0)"
                        }}
                      />
                      {(() => {
                        const point = draggedPoint || hoveredPoint;
                        const { axisX, axisY } = calculateDisplayValues(point!.x, point!.y);
                        return `(${axisX.toFixed(3)}, ${axisY.toFixed(3)})`;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-[800px] h-[400px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Load an NPY file to view</p>
            </div>
          )}
        </div>
        {texture && (
          <div className="mb-4 flex gap-4 mt-5">
            <button
              onClick={() => {
                setImageTransform({
                  rotationCounterClockwise: !state.imageTransform.rotationCounterClockwise,
                  rotationClockwise: false // Disable clockwise when counter-clockwise is enabled
                });
              }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${imageTransform.rotationCounterClockwise
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
                  rotationCounterClockwise: false // Disable counter-clockwise when clockwise is enabled
                });
              }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${imageTransform.rotationClockwise
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
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${imageTransform.flipHorizontal
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
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${imageTransform.flipVertical
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
            >
              Flip Vertical
            </button>
          </div>
        )}
        {/* Controls Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg w-full max-w-md">
          <h3 className="font-semibold mb-2 text-center">Controls:</h3>
          <ul className="space-y-1 text-sm text-gray-600 text-center">
            <li>Shift + Click: Add point</li>
            <li>Alt + Click: Remove point</li>
            <li>Hover over points to see coordinates</li>
          </ul>
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleDownloadPoints}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
              disabled={points.length === 0}
            >
              Download Points
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50"> {/* Added z-50 */}
          <div className="text-gray-600 bg-white px-4 py-2 rounded-lg shadow-md">
            Processing image...
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 text-center text-red-600">{error}</div>
      )}
    </div>
  );
}
