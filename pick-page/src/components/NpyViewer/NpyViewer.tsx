import { Container, Sprite, Graphics, Text, Texture } from "pixi.js";
import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { extend } from "@pixi/react";
import {
  useNpyViewer,
  type ColorMapKey,
  getColorFromMap,
} from "../../context/NpyViewerContext";
import { BasePlot } from "../controls/BasePlot";
import { FileInput } from "../controls/FileInput";
import { ErrorTip } from "../controls/ErrorTip";
import { ColorMapEditor } from './ColorMapEditor';

extend({ Container, Sprite, Graphics, Text });

interface Window {
  showSaveFilePicker(options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }): Promise<FileSystemFileHandle>;
}

export function NpyViewer() {
  const {
    state,
    addPoint,
    updatePoint,
    removePoint,
    setHoveredPoint,
    setIsDragging,
    setDraggedPoint,
    setColorMap,
    setImageTransform,
    setAxisLimits,
    loadNpyFile,
    setLoading,
    setError,
    drawOrigin,
    top,
    bottom,
    left,
    right,
    isAxisSwapped,
  } = useNpyViewer();

  const {
    textureData,
    isLoading,
    points,
    hoveredPoint,
    isDragging,
    draggedPoint,
    selectedColorMap,
    axisLimits,
    gridData,
    frequencyData,
    slownessData,
    error,
    coordinateMatrix,
    colorMaps,
    
  } = state;

  const lastFileRef = useRef<File | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [texture, setTexture] = useState<Texture | null>(null);
  const [plotDimensions, setPlotDimensions] = useState({
    width: 640,
    height: 480,
  });
  const [showColorMapEditor, setShowColorMapEditor] = useState(false);

  // Add transform function that works with stored data
  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      setPlotDimensions(dimensions);
    },
    []
  );

  const createTexture = (
    transformedData: number[],
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
      const normalizedValue =
        (transformedData[i] - dataRange.min) / (dataRange.max - dataRange.min);
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

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!texture) return;

      const rect = plotRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Add new point with Shift first, regardless of hover state
      if (event.shiftKey) {
        event.preventDefault(); 
        event.stopPropagation();

        const newPoint = {
          x: x,
          y: y,
          value: 0,
          color: 0xff0000,
        };

        addPoint(newPoint);
        return;
      }

      // Check for existing point for other interactions
      const clickedPoint = points.find((point) => {
        const dx = point.x - x;
        const dy = point.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 10;
      });

      if (clickedPoint) {
        setHoveredPoint(null);
        if (event.altKey) {
          // Remove point
          removePoint(points.indexOf(clickedPoint));
        } else {
          setIsDragging(true);
          setDraggedPoint(clickedPoint);
        }
      }
    },
    [texture, points]
  );

  // Update handlePointerUp to handle both normal and outside cases
  const handlePointerUp = useCallback(() => {
    if (!texture) return;

    // Reset all states
    setIsDragging(false);
    setDraggedPoint(null);
    setHoveredPoint(null);
  }, [texture]);

  // Update handlePointerMove to check isDragging state more strictly
  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!texture) return;

      const rect = plotRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Only process drag if we're actually in dragging state and have a dragged point
      if (isDragging && draggedPoint && event.buttons > 0) {
        const updatedPoint = {
          ...draggedPoint,
          x,
          y,
        };

        updatePoint(points.indexOf(draggedPoint), updatedPoint);
        setDraggedPoint(updatedPoint);
      } else {
        const hoveredPoint = points.find((point) => {
          const dx = point.x - x;
          const dy = point.y - y;
          return Math.sqrt(dx * dx + dy * dy) < 10;
        });
        setHoveredPoint(hoveredPoint || null);

        // If we were dragging but button is no longer pressed, reset drag state
        if (isDragging && event.buttons === 0) {
          setIsDragging(false);
          setDraggedPoint(null);
        }
      }
    },
    [texture, isDragging, draggedPoint, points]
  );

  // Update handleFileSelect to store original data
  const handleFileSelect = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      dataType: "freq" | "slow" | "grid"
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.name.includes(dataType)) {
        lastFileRef.current = file;
        await loadNpyFile(file, dataType);
      } else {
        setError(`Invalid file for ${dataType}`);
        lastFileRef.current = null;
        return;
      }
    },
    [loadNpyFile, setError]
  );

  // Update handleAxisLimitChange to handle immediate updates
  const handleAxisLimitChange = (
    axis: "xmin" | "xmax" | "ymin" | "ymax",
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newLimits = { ...state.axisLimits, [axis]: numValue };
      if (
        newLimits.xmin >= newLimits.xmax ||
        newLimits.ymin >= newLimits.ymax ||
        newLimits.xmin < 0 ||
        newLimits.ymin < 0 ||
        newLimits.xmax < 0 ||
        newLimits.ymax < 0
      ) {
        return; // Don't update if invalid
      }
      setAxisLimits(newLimits);
    }
  };

  //Draw function
  const handleDraw = () => {
    setLoading(true);
    drawOrigin();
  };

  // Add download function
  const handleDownloadPoints = useCallback(() => {
    // Sort points by x-axis value and format with display values
    const pointsData = points
      .map((point) => {
        const x = coordinateHelpers.fromScreenX(point.x);
        const y = coordinateHelpers.fromScreenY(point.y);
        const slowness = isAxisSwapped() ? y:x;
        const frequency = isAxisSwapped() ? x:y;
        return {
          d1: 0,
          d2: 0,
          frequency,
          d3: 0,
          slowness,
          d4:0,
          d5:0,
        }
      })
      .sort((a, b) => a.frequency - b.frequency) // Sort in descending order (right to left)
      .map((point) => `${point.d1.toFixed(6)}, ${point.d2.toFixed(6)}, ${point.frequency.toFixed(6)}, ${point.d3.toFixed(6)}, ${point.slowness.toFixed(6)}, ${point.d4.toFixed(6)}, ${point.d5.toFixed(6)}`)
      .join("\n");

    // Create blob and download link
    const blob = new Blob([pointsData], { type: "text/plain" });

    // Use showSaveFilePicker API for native file save dialog
    try {
      (window as unknown as Window)
        .showSaveFilePicker({
          suggestedName: "plotted_points.pck",
          types: [
            {
              description: "Picked Points",
              accept: {
                "text/plain": [".pck"],
              },
            },
          ],
        })
        .then(async (handle: any) => {
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        });
    } catch (err) {
      // Fallback for browsers that don't support showSaveFilePicker
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plotted_points.pck";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [points]);

  useEffect(() => {
    // Create the texture with the current color map
    if (!textureData || !gridData) return;
    if (plotDimensions.width === 0 || plotDimensions.height === 0) return;

    const texture = createTexture(
      textureData.transformed.flat(),
      textureData.dimensions,
      { min: gridData.min, max: gridData.max },
      [...colorMaps[selectedColorMap]]
    );

    setTexture(texture);

    const redrawTimeout = setTimeout(() => {
      setLoading(true);
      setLoading(false);
    }, 50);

    return () => clearTimeout(redrawTimeout);
  }, [textureData, selectedColorMap, plotDimensions, colorMaps]);

  useEffect(() => {
    setLoading(false);
  }, [texture]);

  const coordinateHelpers = useMemo(
    () => ({
      toScreenX: (value: number) => {
        return (
          ((value - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) *
          plotDimensions.width
        );
      },
      fromScreenX: (x: number) => {
        const value =
          left() > right()
            ? right() +
              ((plotDimensions.width - x) / plotDimensions.width) *
                (left() - right())
            : left() + (x / plotDimensions.width) * (right() - left());

        return Math.round(value * 1000000) / 1000000;
      },
      toScreenY: (value: number) => {
        return (
          ((value - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) *
          plotDimensions.height
        );
      },
      fromScreenY: (y: number) => {
        const value =
          top() > bottom()
            ? bottom() +
              ((plotDimensions.height - y) / plotDimensions.height) *
                (top() - bottom())
            : top() + (y / plotDimensions.height) * (bottom() - top());

        return Math.round(value * 1000000) / 1000000;
      },
    }),
    [axisLimits, plotDimensions, coordinateMatrix]
  );
  
  useEffect(() => {
    console.log("colorMap:", state.colorMaps)
  }, [state.colorMaps])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 w-full h-full">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Updating...</span>
          </div>
        </div>
      )}
      <div className="relative w-full h-full">
        <div className="flex flex-col h-full gap-4 p-4">
          {/* File Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <FileInput
                label="Main Data (NPY)"
                onChange={(e) => handleFileSelect(e, "grid")}
              />
            </div>
            <div>
              <FileInput
                label="X-Axis Data (NPY)"
                onChange={(e) => handleFileSelect(e, "slow")}
              />
            </div>
            <div>
              <FileInput
                label="Y-Axis Data (NPY)"
                onChange={(e) => handleFileSelect(e, "freq")}
              />
            </div>
          </div>

          {/* Add the global error tip outside the grid */}
          <ErrorTip message={error} />

          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
            {/* Left Side - Plot */}
            <div className="flex-1 min-h-[400px] lg:min-h-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              {texture ? (
                <BasePlot
                  ref={plotRef}
                  xLabel={!isAxisSwapped() ? "Slowness" : "Frequency"}
                  yLabel={!isAxisSwapped() ? "Frequency" : "Slowness"}
                  xMax={right()}
                  xMin={left()}
                  yMin={bottom()}
                  yMax={top()}
                  display={(value) => value.toFixed(6)}
                  tooltipContent={
                    hoveredPoint
                      ? isAxisSwapped()
                        ? `(Freq:${coordinateHelpers
                            .fromScreenX(hoveredPoint.x)
                            .toFixed(6)}, 
                    Slow:${coordinateHelpers
                      .fromScreenY(hoveredPoint.y)
                      .toFixed(6)})`
                        : `(Slow:${coordinateHelpers
                            .fromScreenX(hoveredPoint.x)
                            .toFixed(6)}, 
                    Freq:${coordinateHelpers
                      .fromScreenY(hoveredPoint.y)
                      .toFixed(6)})`
                      : draggedPoint
                      ? isAxisSwapped()
                        ? `(Freq:${coordinateHelpers
                            .fromScreenX(draggedPoint.x)
                            .toFixed(6)}, 
                  Slow:${coordinateHelpers
                    .fromScreenY(draggedPoint.y)
                    .toFixed(6)})`
                        : `(Slow:${coordinateHelpers
                            .fromScreenX(draggedPoint.x)
                            .toFixed(6)}, 
                  Freq:${coordinateHelpers
                    .fromScreenY(draggedPoint.y)
                    .toFixed(6)})`
                      : undefined
                  }
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onDimensionChange={handleDimensionChange}
                >
                  <pixiContainer>
                    {texture && (
                      <pixiSprite
                        texture={texture}
                        width={plotDimensions.width}
                        height={plotDimensions.height}
                        anchor={0}
                      />
                    )}
                    <pixiGraphics
                      draw={(g) => {
                        g.clear();

                        // Draw points
                        points.forEach((point) => {
                          const isHovered = hoveredPoint === point;
                          const isDragged = draggedPoint === point;

                          g.setFillStyle({
                            color: isHovered || isDragged ? 0x00ff00 : 0xff0000,
                            alpha: 0.8,
                          });
                          g.circle(
                            point.x,
                            point.y,
                            isHovered || isDragged ? 6 : 4
                          );
                          g.fill();
                        });
                      }}
                    />
                  </pixiContainer>
                </BasePlot>
              ) : (
                <p className="text-gray-500">Load an NPY file to view</p>
              )}
            </div>

            {/* Right Side - Controls */}
            <div className="lg:w-80 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {/* Controls Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Controls</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Shift + Click: Add point</li>
                    <li>• Alt + Click: Remove point</li>
                    <li>• Hover: View coordinates</li>
                  </ul>
                  <button
                    onClick={handleDraw}
                    className="w-full mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      gridData === null &&
                      slownessData === null &&
                      frequencyData === null
                    }
                  >
                    Draw
                  </button>
                  <button
                    onClick={handleDownloadPoints}
                    className="w-full mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={points.length === 0}
                  >
                    Download Points
                  </button>
                </div>
                {/* Axis Controls */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3">
                    Axis Limits
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-24">
                        Y Max:
                      </label>
                      <input
                        type="number"
                        value={axisLimits.ymax ?? 0} // Provide default value
                        onChange={(e) =>
                          handleAxisLimitChange("ymax", e.target.value)
                        }
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        step="1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-24">
                        X Max:
                      </label>
                      <input
                        type="number"
                        value={axisLimits.xmax ?? 0} // Provide default value
                        onChange={(e) =>
                          handleAxisLimitChange("xmax", e.target.value)
                        }
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        step="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Transform Controls */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3">Transform</h3>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        setLoading(true);
                        setImageTransform({
                          type: "rotationCounterClockwise",
                          rectSize: plotDimensions,
                        });
                      }}
                      className="w-10 h-10 rounded-md flex items-center justify-center bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-white"
                      title="Rotate Counter-clockwise"
                    >
                      ↺
                    </button>
                    <button
                      onClick={() => {
                        setLoading(true);
                        setImageTransform({
                          type: "rotationClockwise",
                          rectSize: plotDimensions,
                        });
                      }}
                      className="w-10 h-10 rounded-md flex items-center justify-center bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-white"
                      title="Rotate Clockwise"
                    >
                      ↻
                    </button>
                    <button
                      onClick={() => {
                        setLoading(true);
                        setImageTransform({
                          type: "flipHorizontal",
                          rectSize: plotDimensions,
                        });
                      }}
                      className="w-10 h-10 rounded-md flex items-center justify-center bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-white"
                      title="Flip Horizontal"
                    >
                      ↔
                    </button>
                    <button
                      onClick={() => {
                        setLoading(true);
                        setImageTransform({
                          type: "flipVertical",
                          rectSize: plotDimensions,
                        });
                      }}
                      className="w-10 h-10 rounded-md flex items-center justify-center bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-white"
                      title="Flip Vertical"
                    >
                      ↕
                    </button>
                  </div>
                </div>

                {/* Color Maps */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3">Color Map</h3>
                  <div className="flex gap-2">
                    <select
                      value={selectedColorMap}
                      onChange={(e) => setColorMap(e.target.value as ColorMapKey)}
                      className="flex-grow px-3 py-1.5 text-sm rounded-md border border-gray-300 
                               bg-white text-gray-700 hover:border-blue-500 focus:outline-none 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {(Object.keys(colorMaps) as ColorMapKey[]).map(
                        (mapName) => (
                          <option key={mapName} value={mapName}>
                            {mapName}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 
                               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        gridData === null &&
                        slownessData === null &&
                        frequencyData === null
                      }
                      onClick={() => setShowColorMapEditor(true)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ColorMapEditor 
        isOpen={showColorMapEditor}
        onClose={() => setShowColorMapEditor(false)}
      />
    </>
  );
}
