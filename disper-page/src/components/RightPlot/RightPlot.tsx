import {
  Container,
  Sprite,
  Graphics,
  Text,
  Rectangle,
  TextStyle,
} from "pixi.js";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { extend } from "@pixi/react";
import "@pixi/events";
import { Layer } from "../../types";
import { useDisper } from "../../context/DisperContext";
import { Window } from "../../types";
import { BasePlot } from "../controls/BasePlot";
import { FileControls } from "../controls/FileControls";

extend({ Container, Sprite, Graphics, Text });

interface DragState {
  layerIndex: number;
  type: "boundary" | "velocity";
  isDragging: boolean;
}

const VELOCITY_MARGIN_FACTOR = 1.1; // 110% of max velocity

export const RightPlot = () => {
  const {
    state: { layers, asceVersion, displayUnits},
    setLayers,
    splitLayer,
    deleteLayer,
    setAsceVersion,
    ToFeet,
    ToMeter,
  } = useDisper();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [plotDimensions, setPlotDimensions] = useState({
    width: 640,
    height: 480,
  });

  const [axisLimits, setAxisLimits] = useState({
    xmin: 50,
    xmax: 1400,
    ymin: 0,
    ymax: 100,
  });

  const plotRef = useRef<HTMLDivElement>(null);

  // Update coordinate helpers to use dynamic dimensions
  const coordinateHelpers = useMemo(
    () => ({
      toScreenX: (value: number) => {
        // Add 10px offset for the left margin
        return (
          ((value - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) *
            (plotDimensions.width - 20) +
          10
        );
      },
      fromScreenX: (x: number) => {
        // Subtract the 10px offset and adjust for margin
        const adjustedX = Math.max(0, x - 10);
        if (adjustedX <= 0) return axisLimits.xmin;

        const value =
          axisLimits.xmin +
          (adjustedX / (plotDimensions.width - 20)) *
            (axisLimits.xmax - axisLimits.xmin);

        return Math.round(value * 10) / 10;
      },
      toScreenY: (value: number) => {
        // Add 10px offset for the top margin and subtract from height for bottom margin
        return (
          ((value - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) *
            (plotDimensions.height - 20) +
          10
        );
      },
      fromScreenY: (y: number) => {
        // Subtract the 10px offset and adjust for margins
        const adjustedY = Math.max(0, y - 10);
        if (adjustedY <= 0) return axisLimits.ymin;

        const value =
          axisLimits.ymin +
          (adjustedY / (plotDimensions.height - 20)) *
            (axisLimits.ymax - axisLimits.ymin);

        return Math.round(value * 10) / 10;
      },
    }),
    [axisLimits, plotDimensions]
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const data = lines
          .map((line: string) => {
            const [depth, density, ignore, velocity] = line
              .trim()
              .split(" ")
              .map(Number);
            return { depth, density, ignore, velocity };
          })
          .filter((item) => !isNaN(item.depth) && !isNaN(item.velocity));

        if (data.length > 0) {
          // Create layers from consecutive points
          const newLayers: Layer[] = [];
          for (let i = 0; i < data.length - 1; i += 2) {
            const layer: Layer = {
              startDepth: i === 0 ? 0 : data[i].depth, // Force first layer to start at 0
              endDepth: data[i + 1].depth,
              velocity: data[i].velocity,
              density: data[i].density,
              ignore: data[i].ignore,
            };
            newLayers.push(layer);
          }

          // Update axis limits based on data
          const depthValues = data.map((d) => d.depth);
          const velocityValues = data.map((d) => d.velocity);
          const maxVelocity = Math.max(...velocityValues);

          const newAxisLimits = {
            xmin: 0,
            xmax: Math.ceil(maxVelocity * VELOCITY_MARGIN_FACTOR), // Set max velocity to 110% of highest velocity
            ymin: 0,
            ymax: Math.ceil(Math.max(...depthValues)),
          };

          setLayers(newLayers);
          setAxisLimits(newAxisLimits);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePointerDown = useCallback(
    (
      event: React.PointerEvent,
      layerIndex: number,
      type: "boundary" | "velocity"
    ) => {
      event.stopPropagation();
      const rect = plotRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDragState({
        layerIndex,
        type,
        isDragging: true,
      });
    },
    [layers, coordinateHelpers]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!plotRef.current) return;

      const rect = plotRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Handle dragging
      if (dragState?.isDragging) {
        handleDrag(x, y);
        return;
      }

      // Handle hover effects
      handleHover(x, y);
    },
    [dragState]
  );

  const handleDrag = useCallback(
    (x: number, y: number) => {
      if (!dragState) return;

      const newLayers = [...layers];

      if (dragState.type === "velocity") {
        // Handle velocity drag (red line)
        let newVelocity = coordinateHelpers.fromScreenX(x);

        // Special handling for near-zero/xmin values
        if (x <= 10) {
          newVelocity = axisLimits.xmin;
        }

        // Constrain velocity between xmin and xmax
        const constrainedVelocity = Math.max(
          axisLimits.xmin,
          Math.min(axisLimits.xmax, newVelocity)
        );

        newLayers[dragState.layerIndex].velocity = constrainedVelocity;
        setLayers(newLayers);

        // Update tooltip while dragging
        setTooltipContent(
          `Velocity: ${
            displayUnits === "ft"
              ? ToFeet(constrainedVelocity).toFixed(1)
              : constrainedVelocity.toFixed(1)
          } ${displayUnits}/s`
        );
      } else {
        // Handle boundary drag (black line)
        const newDepth = coordinateHelpers.fromScreenY(y);

        // Determine the valid range for the current boundary
        let minDepth = 0;
        let maxDepth = axisLimits.ymax;

        if (dragState.layerIndex === 0) {
          // First layer's start depth
          maxDepth = layers[0].endDepth - 0.1;
        } else if (dragState.layerIndex === layers.length) {
          // Last layer's end depth
          minDepth = layers[layers.length - 1].startDepth + 0.1;
        } else {
          // Middle layer boundary
          minDepth = layers[dragState.layerIndex - 1].startDepth + 0.1;
          maxDepth = layers[dragState.layerIndex].endDepth - 0.1;
        }

        // Constrain the depth value
        const constrainedDepth = Math.max(
          minDepth,
          Math.min(maxDepth, newDepth)
        );

        // Update the appropriate layer boundaries
        if (dragState.layerIndex === 0) {
          newLayers[0].startDepth = constrainedDepth;
        } else if (dragState.layerIndex === layers.length) {
          newLayers[layers.length - 1].endDepth = constrainedDepth;
        } else {
          newLayers[dragState.layerIndex - 1].endDepth = constrainedDepth;
          newLayers[dragState.layerIndex].startDepth = constrainedDepth;
        }

        setLayers(newLayers);
        // Update tooltip while dragging
        setTooltipContent(
          `Depth: ${
            displayUnits === "ft"
              ? ToFeet(constrainedDepth).toFixed(1)
              : constrainedDepth.toFixed(1)
          } ${displayUnits}/s`
        );
      }
    },
    [dragState, layers, coordinateHelpers, axisLimits, displayUnits]
  );

  const handleHover = useCallback(
    (x: number, y: number) => {
      let found = false;

      // Check velocity lines
      layers.forEach((layer) => {
        const screenX = coordinateHelpers.toScreenX(layer.velocity);
        if (Math.abs(x - screenX) < 10) {
          setTooltipContent(
            `Velocity: ${
              displayUnits === "ft"
                ? ToFeet(layer.velocity).toFixed(1)
                : layer.velocity.toFixed(1)
            } ${displayUnits}/s`
          );
          found = true;
        }
      });

      // Check depth lines
      if (!found) {
        layers.forEach((layer) => {
          const screenY = coordinateHelpers.toScreenY(layer.endDepth);
          if (Math.abs(y - screenY) < 10) {
            setTooltipContent(
              `Depth: ${
                displayUnits === "ft"
                  ? ToFeet(layer.endDepth).toFixed(1)
                  : layer.endDepth.toFixed(1)
              } ${displayUnits}`
            );

            found = true;
          }
        });
      }

      if (!found) {
        setTooltipContent("");
      }
    },
    [layers, coordinateHelpers, displayUnits]
  );

  const handleDownloadLayers = useCallback(() => {
    const OutputData = [];
    for (let i = 0; i < layers.length; i++) {
      const current = layers[i];
      OutputData.push({
        depth: current.startDepth,
        density: current.density,
        ignore: current.ignore,
        velocity: current.velocity,
      });

      // For the last layer, use max(50, axisLimits.ymax) as the end depth
      const endDepth =
        i === layers.length - 1 ? axisLimits.ymax : current.endDepth;

      OutputData.push({
        depth: endDepth,
        density: current.density,
        ignore: current.ignore,
        velocity: current.velocity,
      });
    }

    const outTXT = OutputData.sort((a, b) => a.depth - b.depth)
      .map(
        (output: any) =>
          `${output.depth.toFixed(3)} ${output.density.toFixed(
            3
          )} ${output.ignore.toFixed(3)} ${output.velocity.toFixed(3)}`
      )
      .join("\n");

    // Create blob
    const blob = new Blob([outTXT], { type: "text/plain" });

    // Use showSaveFilePicker API for native file save dialog
    try {
      (window as unknown as Window)
        .showSaveFilePicker({
          suggestedName: "velocity_model.txt",
          types: [
            {
              description: "Text Files",
              accept: {
                "text/plain": [".txt"],
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
      link.download = "velocity_model.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [layers, axisLimits.ymax]);

  // Add click handler for the plot area
  const handlePlotClick = (event: React.PointerEvent) => {
    if (layers.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = event.clientY - rect.top;

      // Find which layer was clicked
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const startY =
          ((layer.startDepth - axisLimits.ymin) /
            (axisLimits.ymax - axisLimits.ymin)) *
          plotDimensions.height;
        const endY =
          ((layer.endDepth - axisLimits.ymin) /
            (axisLimits.ymax - axisLimits.ymin)) *
          plotDimensions.height;

        if (y >= startY && y <= endY) {
          const newDepth =
            axisLimits.ymin +
            (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin);

          if (newDepth > layer.startDepth && newDepth < layer.endDepth) {
            if (event.shiftKey) {
              splitLayer(i, newDepth);
            } else if (event.altKey) {
              if (deleteLayer) {
                deleteLayer(i);
              }
            }
            break;
          }
        }
      }
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, []);

  useEffect(() => {
    if (layers.length > 0) {
      const newLayers = [...layers];
      newLayers[layers.length - 1].endDepth = axisLimits.ymax;
      setLayers(newLayers);
    }
  }, [axisLimits.ymax]);

  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      setPlotDimensions(dimensions);
    },
    []
  );

  return (
    <div className="flex flex-col items-center border-2 border-gray-300 rounded-lg p-4 shadow-sm w-full">
      <div className="w-full h-full relative">
        <div className="flex gap-4 flex-wrap justify-center mb-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max Depth:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(axisLimits.ymax)
                    : axisLimits.ymax
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setAxisLimits((prev) => ({
                    ...prev,
                    ymax: valueInMeters,
                  }));
                }}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={displayUnits === "ft" ? "0.5" : "0.1"}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min Depth:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(axisLimits.ymin)
                    : axisLimits.ymin
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setAxisLimits((prev) => ({
                    ...prev,
                    ymin: valueInMeters,
                  }));
                }}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={displayUnits === "ft" ? "0.5" : "0.1"}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max Velocity:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(axisLimits.xmax)
                    : axisLimits.xmax
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setAxisLimits((prev) => ({
                    ...prev,
                    xmax: valueInMeters,
                  }));
                }}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={displayUnits === "ft" ? "1.0" : "0.5"}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min Velocity:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(axisLimits.xmin)
                    : axisLimits.xmin
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setAxisLimits((prev) => ({
                    ...prev,
                    xmin: valueInMeters,
                  }));
                }}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                min="0"
                step={displayUnits === "ft" ? "1.0" : "0.5"}
              />
            </div>
          </div>
        </div>

        <FileControls
          onFileSelect={handleFileSelect}
          onDownload={handleDownloadLayers}
        />

        <BasePlot
          xLabel={`Velocity (${displayUnits}/s)`}
          yLabel={`Depth (${displayUnits})`}
          xMin={axisLimits.xmin}
          xMax={axisLimits.xmax}
          yMin={axisLimits.ymin}
          yMax={axisLimits.ymax}
          display={(value) =>
            displayUnits === "ft" ? ToFeet(value).toFixed(3) : value.toFixed(3)
          }
          tooltipContent={tooltipContent}
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            setDragState(null);
            setTooltipContent("");
          }}
          onPointerDown={handlePlotClick}
          onDimensionChange={handleDimensionChange}
          ref={plotRef}
        >
          <pixiContainer>
            <pixiGraphics
              draw={(g) => {
                g.clear();
                // Draw the main plot area boundary
                // g.setStrokeStyle({ width: 1, color: 0xCCCCCC });
                // g.setFillStyle({color:0xEEEEEE, alpha:0.5});
                // g.rect(10, 10, plotDimensions.width - 20, plotDimensions.height - 20);
                // g.fill();

                // Draw grid lines
                g.setStrokeStyle({ width: 1, color: 0xeeeeee, alpha: 0.8 });

                // Vertical grid lines (velocity)
                const velocityStep = (axisLimits.xmax - axisLimits.xmin) / 10;
                for (
                  let v = axisLimits.xmin;
                  v <= axisLimits.xmax;
                  v += velocityStep
                ) {
                  const x = coordinateHelpers.toScreenX(v);
                  g.moveTo(x, 10);
                  g.lineTo(x, plotDimensions.height - 10);
                }

                // Horizontal grid lines (depth)
                const depthStep = (axisLimits.ymax - axisLimits.ymin) / 10;
                for (
                  let d = axisLimits.ymin;
                  d <= axisLimits.ymax;
                  d += depthStep
                ) {
                  const y = coordinateHelpers.toScreenY(d);
                  g.moveTo(10, y);
                  g.lineTo(plotDimensions.width - 10, y);
                }
                g.stroke();
              }}
            />
            {layers.slice(0, -1).map((layer: any, index: number) => (
              <pixiGraphics
                key={`boundary-${index}-${Date.now()}`}
                draw={(g) => {
                  g.clear();
                  g.setStrokeStyle({
                    width: 2,
                    color: 0x000000,
                    alignment: 0.5,
                  }); // alignment: 0.5 for crisp lines
                  const y = Math.round(
                    coordinateHelpers.toScreenY(layer.endDepth)
                  );
                  g.moveTo(10, y);
                  g.lineTo(plotDimensions.width - 10, y);
                  g.stroke();
                }}
                eventMode="static"
                cursor="ns-resize"
                hitArea={
                  new Rectangle(
                    10,
                    coordinateHelpers.toScreenY(layer.endDepth) - 5,
                    plotDimensions.width - 20,
                    10
                  )
                }
                onpointerdown={(e: any) =>
                  handlePointerDown(e, index + 1, "boundary")
                }
              />
            ))}

            {layers.map((layer: any, index: number) => (
              <pixiContainer key={`velocity-container-${index}-${Date.now()}`}>
                <pixiGraphics
                  draw={(g) => {
                    g.clear();
                    g.setStrokeStyle({
                      width: 2,
                      color: 0xff0000,
                      alignment: 0.5,
                    }); // alignment: 0.5 for crisp lines
                    const x = Math.round(
                      coordinateHelpers.toScreenX(layer.velocity)
                    );
                    const startY = Math.round(
                      coordinateHelpers.toScreenY(layer.startDepth)
                    );
                    const endY =
                      index === layers.length - 1
                        ? plotDimensions.height - 10
                        : Math.round(
                            coordinateHelpers.toScreenY(layer.endDepth)
                          );
                    g.moveTo(x, startY);
                    g.lineTo(x, endY);
                    g.stroke();
                  }}
                  eventMode="static"
                  cursor="ew-resize"
                  hitArea={
                    new Rectangle(
                      coordinateHelpers.toScreenX(layer.velocity) - 5,
                      coordinateHelpers.toScreenY(layer.startDepth),
                      10,
                      coordinateHelpers.toScreenY(layer.endDepth) -
                        coordinateHelpers.toScreenY(layer.startDepth)
                    )
                  }
                  onpointerdown={(e: any) =>
                    handlePointerDown(e, index, "velocity")
                  }
                />
                <pixiText
                  text={`${
                    displayUnits === "ft"
                      ? ToFeet(layer.velocity).toFixed(0)
                      : layer.velocity.toFixed(0)
                  }`}
                  x={coordinateHelpers.toScreenX(layer.velocity) + 5}
                  y={
                    (coordinateHelpers.toScreenY(layer.startDepth) +
                      coordinateHelpers.toScreenY(layer.endDepth)) /
                      2 -
                    7
                  }
                  style={
                    new TextStyle({
                      fontSize: 12,
                      fill: 0xff0000,
                    })
                  }
                />
              </pixiContainer>
            ))}
          </pixiContainer>
        </BasePlot>
      </div>
      <div className="mt-4 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-600">
            ASCE Version:
          </label>
          <select
            value={asceVersion}
            onChange={(e) => setAsceVersion(e.target.value)}
            className="w-30 px-2 py-1 text-sm border rounded shadow-sm"
          >
            <option value="ASCE 7-22">ASCE 7-22</option>
            <option value="ASCE 7-16">ASCE 7-16</option>
          </select>
        </div>
      </div>
    </div>
  );
};
