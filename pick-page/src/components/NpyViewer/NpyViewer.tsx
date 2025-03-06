import {
  Container,
  Sprite,
  Graphics,
  Text,
  Texture,
} from "pixi.js";
import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { extend } from "@pixi/react";
import {
  useNpyViewer,
  COLOR_MAPS,
  type ColorMapKey,
  getColorFromMap,
} from "../../context/NpyViewerContext";
import { BasePlot } from "../controls/BasePlot";
import { FileInput } from "../controls/FileInput";

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
    setColorMap,
    setImageTransform,
    setAxisLimits,
    loadNpyFile,
    setLoading,
    applyTransformations
  } = useNpyViewer();

  const {
    textureData,
    isLoading,
    points,
    hoveredPoint,
    isDragging,
    draggedPoint,
    selectedColorMap,
    imageTransform,
    axisLimits,
    originalData,
    frequencyData,
    slownessData
  } = state;

  const lastFileRef = useRef<File | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [texture, setTexture] = useState<Texture | null>(null);
  const [plotDimensions, setPlotDimensions] = useState({
    width: 640,
    height: 480,
  });
  // Add transform function that works with stored data
  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      setPlotDimensions(dimensions);
    },
    []
  );

  const coordinateHelpers = useMemo(
    () => ({
      toScreenX: (value: number) => {
        // Add 10px offset for the left margin
        return (
          ((value - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) *
            plotDimensions.width +
          10
        );
      },
      fromScreenX: (x: number) => {
        // Subtract the 10px offset and adjust for margin
        const adjustedX = Math.max(0, x);
        if (adjustedX <= 0) return axisLimits.xmin;

        const value =
          axisLimits.xmin +
          (adjustedX / plotDimensions.width) *
            (axisLimits.xmax - axisLimits.xmin);

        return Math.round(value * 10000) / 10000;
      },
      toScreenY: (value: number) => {
        // Add 10px offset for the top margin and subtract from height for bottom margin
        return (
          ((value - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) *
            plotDimensions.height +
          10
        );
      },
      fromScreenY: (y: number) => {
        // Subtract the 10px offset and adjust for margins
        const adjustedY = Math.max(0, y);
        if (adjustedY <= 0) return axisLimits.ymin;

        const value =
          axisLimits.ymin +
          (adjustedY / plotDimensions.height) *
            (axisLimits.ymax - axisLimits.ymin);

        return Math.round(value * 10000) / 10000;
      },
    }),
    [axisLimits, plotDimensions]
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

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Add new point with Shift first, regardless of hover state
      if (event.shiftKey) {
        const newPoint = { x, y, value: 0, color: 0xff0000 };
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
      dataType: "frequency" | "slowness" | "data"
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;
      lastFileRef.current = file;
      await loadNpyFile(file, dataType);
    },
    [loadNpyFile]
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
        newLimits.ymin >= newLimits.ymax||
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
  const handleDraw = useCallback(() => {
    if (!originalData || !frequencyData || !slownessData) return;
    applyTransformations()
  }, [originalData, frequencyData, slownessData])

  // Add download function
  const handleDownloadPoints = useCallback(() => {
    // Sort points by x-axis value and format with display values
    const pointsData = points
      .map((point) => {
        const x = coordinateHelpers.fromScreenX(point.x);
        const y = coordinateHelpers.fromScreenY(point.y);
        return { x, y };
      })
      .sort((a, b) => a.x - b.x) // Sort in descending order (right to left)
      .map((point) => `${point.x.toFixed(3)}, ${point.y.toFixed(3)}`)
      .join("\n");

    // Create blob and download link
    const blob = new Blob([pointsData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plotted_points.txt";

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [points]);

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
  }, [textureData]);

  useEffect(() => {
    setLoading(false);
  }, [texture]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Updating...</span>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full gap-4 p-4">
        {/* File Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FileInput
            label="Main Data (NPY)"
            onChange={(e) => handleFileSelect(e, "data")}
          />
          <FileInput
            label="X-Axis Data (NPY)"
            onChange={(e) => handleFileSelect(e, "frequency")}
          />
          <FileInput
            label="Y-Axis Data (NPY)"
            onChange={(e) => handleFileSelect(e, "slowness")}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
          {/* Left Side - Plot */}
          <div className="flex-1 min-h-[400px] lg:min-h-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
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
                tooltipContent={
                  hoveredPoint
                    ? `(Freq:${coordinateHelpers
                        .fromScreenX(hoveredPoint.x)
                        .toFixed(3)}, 
                    Slow:${coordinateHelpers
                      .fromScreenY(hoveredPoint.y)
                      .toFixed(3)})`
                    : draggedPoint
                    ? `(Freq:${coordinateHelpers
                        .fromScreenX(draggedPoint.x)
                        .toFixed(3)}
                    Slow:${coordinateHelpers
                      .fromScreenY(draggedPoint.y)
                      .toFixed(3)}`
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
                  disabled={(originalData === null) && (slownessData === null) && (frequencyData === null)}
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
                <h3 className="font-medium text-gray-700 mb-3">Axis Limits</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24">Y Max:</label>
                    <input
                      type="number"
                      value={axisLimits.ymax ?? 0}  // Provide default value
                      onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      step="1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24">Y Min:</label>
                    <input
                      type="number"
                      value={axisLimits.ymin ?? 0}  // Provide default value
                      onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      step="1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24">X Max:</label>
                    <input
                      type="number"
                      value={axisLimits.xmax ?? 0}  // Provide default value
                      onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      step="1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24">X Min:</label>
                    <input
                      type="number"
                      value={axisLimits.xmin ?? 0}  // Provide default value
                      onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
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
                      setImageTransform({
                        rotationCounterClockwise: !state.imageTransform.rotationCounterClockwise,
                        rotationClockwise: false,
                      });
                    }}
                    className={`w-10 h-10 rounded-md flex items-center justify-center ${
                      imageTransform.rotationCounterClockwise
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                    title="Rotate Counter-clockwise"
                  >
                     ↺
                  </button>
                  <button
                    onClick={() => {
                      setImageTransform({
                        rotationClockwise: !state.imageTransform.rotationClockwise,
                        rotationCounterClockwise: false,
                      });
                    }}
                    className={`w-10 h-10 rounded-md flex items-center justify-center ${
                      imageTransform.rotationClockwise
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                    title="Rotate Clockwise"
                  >
                    ↻
                  </button>
                  <button
                    onClick={() => {
                      setImageTransform({
                        flipHorizontal: !state.imageTransform.flipHorizontal,
                      });
                    }}
                    className={`w-10 h-10 rounded-md flex items-center justify-center ${
                      imageTransform.flipHorizontal
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                    title="Flip Horizontal"
                  >
                    ↔
                  </button>
                  <button
                    onClick={() => {
                      setImageTransform({
                        flipVertical: !state.imageTransform.flipVertical,
                      });
                    }}
                    className={`w-10 h-10 rounded-md flex items-center justify-center ${
                      imageTransform.flipVertical
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                    title="Flip Vertical"
                  >
                    ↕
                  </button>
                </div>
              </div>

              {/* Color Maps */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">Color Map</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(COLOR_MAPS) as ColorMapKey[]).map((mapName) => (
                    <button
                      key={mapName}
                      onClick={() => setColorMap(mapName)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        selectedColorMap === mapName
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      {mapName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
