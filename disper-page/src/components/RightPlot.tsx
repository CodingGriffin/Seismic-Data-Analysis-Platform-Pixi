import { Container, Sprite, Graphics, Text} from "pixi.js";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Application, extend } from "@pixi/react";
extend({ Container, Sprite, Graphics, Text });
import { Window } from "../types";

interface Layer {
  startDepth: number;
  endDepth: number;
  velocity: number;
  density: number;
  ignore: number;
}

// Add new hover state types
interface HoveredLine {
  type: "depth" | "velocity";
  value: number;
  y?: number;
  x?: number;
}

interface DragState {
  layerIndex: number;
  type: "boundary" | "velocity";
  isDragging: boolean;
}

const VELOCITY_MARGIN_FACTOR = 1.1; // 110% of max velocity

export const RightPlot = ({
  handleLayerChange,
  handleAxisLimitsChange,
  asceVersion,
  setAsceVersion,
}: any) => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [hoveredLine, setHoveredLine] = useState<HoveredLine | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [axisLimits, setAxisLimits] = useState({
    xmin: 50,
    xmax: 1000,
    ymin: 0.0,
    ymax: 200.0,
  });
  const [plotDimensions, setPlotDimensions] = useState({
    width: 640,
    height: 480,
  });
  const plotRef = useRef<HTMLDivElement>(null);

  // Update dimensions when component mounts or window resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (plotRef.current) {
        const { width, height } = plotRef.current.getBoundingClientRect();
        setPlotDimensions({ width, height });
        console.log(`Width: ${width}, Height: ${height}`);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    console.log("Layers changed:", layers);
    handleLayerChange(layers);
  }, [layers]);
  useEffect(() => {
    handleAxisLimitsChange(axisLimits);
  }, [axisLimits]);
  // Update coordinate helpers to use dynamic dimensions
  const coordinateHelpers = useMemo(
    () => ({
      toScreenX: (value: number) =>
        ((value - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) *
        plotDimensions.width,
      toScreenY: (value: number) =>
        ((value - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) *
        plotDimensions.height,
      fromScreenX: (x: number) =>
        axisLimits.xmin +
        (x / plotDimensions.width) * (axisLimits.xmax - axisLimits.xmin),
      fromScreenY: (y: number) =>
        axisLimits.ymin +
        (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin),
    }),
    [axisLimits, plotDimensions]
  );

  // Update drawing functions to use dynamic dimensions
  const drawAllLines = useCallback(
    (g: Graphics) => {
      g.clear();
      // Remove all existing children (including text)
      while (g.children[0]) {
        g.children[0].destroy();
      }

      // Draw all black lines first
      if (layers.length > 0) {
        // Draw black lines
        g.setStrokeStyle({
          width: 2,
          color: 0x000000,
          alpha: 1,
        });
        g.beginPath();

        // Skip drawing the first layer's start depth (0)
        // Draw all layer end depths
        layers.forEach((layer) => {
          const y = coordinateHelpers.toScreenY(layer.endDepth);
          g.moveTo(0, y);
          g.lineTo(plotDimensions.width, y);
        });
        g.stroke();
        g.closePath();
      }

      if (layers.length > 0) {
        g.setStrokeStyle({
          width: 2,
          color: 0xff0000,
          alpha: 1,
        });
        g.beginPath();
        layers.forEach((layer) => {
          const x = coordinateHelpers.toScreenX(layer.velocity);
          const startY = coordinateHelpers.toScreenY(layer.startDepth);
          const endY = coordinateHelpers.toScreenY(layer.endDepth);
          g.moveTo(x, startY);
          g.lineTo(x, endY);

          // Add velocity text
          const textY = (startY + endY) / 2;
          const text = new Text({
            text: `${layer.velocity.toFixed(2)}`,
            style: {
              fontSize: 12,
              fill: 0xff0000,
              align: 'right'
            }
          });
          text.position.set(x - 40, textY);
          g.addChild(text);
        });
        g.stroke();
        g.closePath();
      }
    },
    [layers, coordinateHelpers, plotDimensions]
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
              ignore: data[i].ignore
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

  const handlePointerDown = (
    event: React.PointerEvent,
    layerIndex: number,
    type: "boundary" | "velocity"
  ) => {
    event.stopPropagation();

    // Skip if trying to interact with first layer's start boundary
    if (type === "boundary" && layerIndex === 0) {
      return;
    }

    // Handle shift+click to add new layer
    if (event.shiftKey && type === "velocity") {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const newDepth =
        axisLimits.ymin +
        (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin);

      // Only add new layer if click is within the layer's bounds
      const layer = layers[layerIndex];
      if (newDepth > layer.startDepth && newDepth < layer.endDepth) {
        const newLayers = [...layers];

        const upperLayer: Layer = {
          startDepth: layer.startDepth,
          endDepth: newDepth,
          velocity: layer.velocity,
          density: layer.density,
          ignore: layer.ignore
        };

        const lowerLayer: Layer = {
          startDepth: newDepth,
          endDepth: layer.endDepth,
          velocity: layer.velocity,
          density: layer.density,
          ignore: layer.ignore 
        };

        // Replace the current layer with the two new layers
        newLayers.splice(layerIndex, 1, upperLayer, lowerLayer);
        setLayers(newLayers);
        return;
      }
    }

    setDragState({ layerIndex, type, isDragging: true });
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!dragState?.isDragging || !layers.length) {
      // Handle hover state when not dragging
      let found = false;

      // Check black lines (boundaries)
      layers.forEach((layer, index) => {
        const startY =
          index === 0
            ? ((layer.startDepth - axisLimits.ymin) /
                (axisLimits.ymax - axisLimits.ymin)) *
              plotDimensions.height
            : ((layer.endDepth - axisLimits.ymin) /
                (axisLimits.ymax - axisLimits.ymin)) *
              plotDimensions.height;

        if (Math.abs(y - startY) < 10) {
          setHoveredLine({
            type: "depth",
            value: index === 0 ? layer.startDepth : layer.endDepth,
            y: startY,
            x,
          });
          found = true;
        }
      });

      // Check red lines (velocities)
      if (!found) {
        layers.forEach((layer) => {
          const lineX =
            ((layer.velocity - axisLimits.xmin) /
              (axisLimits.xmax - axisLimits.xmin)) *
            plotDimensions.width;
          const startY =
            ((layer.startDepth - axisLimits.ymin) /
              (axisLimits.ymax - axisLimits.ymin)) *
            plotDimensions.height;
          const endY =
            ((layer.endDepth - axisLimits.ymin) /
              (axisLimits.ymax - axisLimits.ymin)) *
            plotDimensions.height;

          if (Math.abs(x - lineX) < 10 && y >= startY && y <= endY) {
            setHoveredLine({
              type: "velocity",
              value: layer.velocity,
              y,
              x: lineX,
            });
            found = true;
          }
        });
      }

      if (!found) {
        setHoveredLine(null);
      }
      return;
    }

    const newLayers = [...layers];

    if (dragState.type === "velocity") {
      // Handle velocity drag (red line)
      const newVelocity =
        axisLimits.xmin +
        (x / plotDimensions.width) * (axisLimits.xmax - axisLimits.xmin);
      const constrainedVelocity = Math.max(
        axisLimits.xmin,
        Math.min(axisLimits.xmax, newVelocity)
      );
      newLayers[dragState.layerIndex].velocity = constrainedVelocity;
      setLayers(newLayers);

      // Update tooltip for velocity
      setHoveredLine({
        type: "velocity",
        value: constrainedVelocity,
        y,
        x:
          ((constrainedVelocity - axisLimits.xmin) /
            (axisLimits.xmax - axisLimits.xmin)) *
          plotDimensions.width,
      });
    } else {
      // Handle boundary drag (black line)
      const newDepth =
        axisLimits.ymin +
        (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin);

      if (dragState.layerIndex === 0) {
        // First layer's start depth
        const maxDepth = layers[0].endDepth;
        const constrainedDepth = Math.min(maxDepth - 0.1, newDepth);
        newLayers[0].startDepth = constrainedDepth;
        setLayers(newLayers);
        // Update tooltip for depth
        setHoveredLine({
          type: "depth",
          value: constrainedDepth,
          y:
            ((constrainedDepth - axisLimits.ymin) /
              (axisLimits.ymax - axisLimits.ymin)) *
            plotDimensions.height,
          x,
        });
      } else if (dragState.layerIndex === layers.length) {
        // Last layer's end depth
        const lastLayer = layers[layers.length - 1];
        const minDepth = lastLayer.startDepth;
        const constrainedDepth = Math.max(minDepth + 0.1, newDepth);
        newLayers[layers.length - 1].endDepth = constrainedDepth;
        setLayers(newLayers);
        // Update tooltip for depth
        setHoveredLine({
          type: "depth",
          value: constrainedDepth,
          y:
            ((constrainedDepth - axisLimits.ymin) /
              (axisLimits.ymax - axisLimits.ymin)) *
            plotDimensions.height,
          x,
        });
      } else {
        // Middle boundaries
        const prevLayer = layers[dragState.layerIndex - 1];
        const nextLayer = layers[dragState.layerIndex];

        // Get constraints from adjacent layers
        const minDepth = prevLayer ? prevLayer.startDepth + 0.1 : -Infinity;
        const maxDepth = nextLayer ? nextLayer.endDepth - 0.1 : Infinity;

        // Constrain the movement
        const constrainedDepth = Math.max(
          minDepth,
          Math.min(maxDepth, newDepth)
        );

        // Update both layers that share this boundary
        if (dragState.layerIndex > 0) {
          newLayers[dragState.layerIndex - 1].endDepth = constrainedDepth;
        }
        newLayers[dragState.layerIndex].startDepth = constrainedDepth;

        setLayers(newLayers);

        // Update tooltip for depth
        setHoveredLine({
          type: "depth",
          value: constrainedDepth,
          y:
            ((constrainedDepth - axisLimits.ymin) /
              (axisLimits.ymax - axisLimits.ymin)) *
            plotDimensions.height,
          x,
        });
      }
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

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

      OutputData.push({
        depth: current.endDepth,
        density: current.density,
        ignore: current.ignore,
        velocity: current.velocity,
      });
    }

    const outTXT = OutputData.sort((a, b) => a.depth - b.depth)
      .map(
        (output: any) =>
          `${output.depth.toFixed(3)} ${output.density.toFixed(3)} ${output.ignore.toFixed(3)} ${output.velocity.toFixed(3)}`)
      .join("\n");

    // Create blob
    const blob = new Blob([outTXT], { type: "text/plain" });

    // Use showSaveFilePicker API for native file save dialog
    try {
      ((window as unknown) as Window).showSaveFilePicker({
        suggestedName: 'velocity_model.txt',
        types: [{
          description: 'Text Files',
          accept: {
            'text/plain': ['.txt'],
          },
        }],
      }).then(async (handle:any) => {
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
  }, [layers]);

  // Add click handler for the plot area
  const handlePlotClick = (event: React.PointerEvent) => {
    if (event.shiftKey && layers.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      // const x = event.clientX - rect.left;
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
          const newLayers = [...layers];

          // Split the current layer into two
          const upperLayer: Layer = {
            startDepth: layer.startDepth,
            endDepth: newDepth,
            velocity: layer.velocity,
            density: layer.density,
            ignore: layer.ignore
          };

          const lowerLayer: Layer = {
            startDepth: newDepth,
            endDepth: layer.endDepth,
            velocity: layer.velocity,
            density: layer.density,
            ignore: layer.ignore
          };

          // Replace the current layer with the two new layers
          newLayers.splice(i, 1, upperLayer, lowerLayer);
          setLayers(newLayers);
          break;
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  return (
    <div className="flex flex-col items-center border-2 border-gray-300 rounded-lg p-4 shadow-sm w-full">
      <div className="w-full">
        <div className="flex gap-4 flex-wrap justify-center mb-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max Depth:
              </label>
              <input
                type="number"
                value={axisLimits.ymax}
                onChange={(e) =>
                  setAxisLimits((prev) => ({
                    ...prev,
                    ymax: parseFloat(e.target.value),
                  }))
                }
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="1"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min Depth:
              </label>
              <input
                type="number"
                value={axisLimits.ymin}
                onChange={(e) => {
                  if (parseFloat(e.target.value) < 0) return;
                  setAxisLimits((prev) => ({
                    ...prev,
                    ymin: parseFloat(e.target.value),
                  }));
                }}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="1"
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
                value={axisLimits.xmax}
                onChange={(e) =>
                  setAxisLimits((prev) => ({
                    ...prev,
                    xmax: parseFloat(e.target.value),
                  }))
                }
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="1.0"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min Velocity:
              </label>
              <input
                type="number"
                value={axisLimits.xmin}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  setAxisLimits((prev) => ({
                    ...prev,
                    xmin: value,
                  }));
                }}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                min="0"
                step="1.0"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 mb-4
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
          />
          <button
            onClick={handleDownloadLayers}
            className="px-4 py-1 bg-blue-50 text-sm border-0 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            // disabled={points.length === 0}
          >
            Download
          </button>
        </div>

        <div
          ref={plotRef}
          className="relative border border-gray-200 rounded-lg bg-white shadow-sm w-full aspect-[4/3] min-h-[300px]"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragState(null)}
          onPointerDown={handlePlotClick}
        >
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-sm">
            Depth (m)
          </div>
          <div className="absolute -left-8 top-0 h-full flex flex-col justify-between">
            <div className="text-xs">{axisLimits.ymin.toFixed(3)}</div>
            <div className="text-xs">{axisLimits.ymax.toFixed(3)}</div>
          </div>

          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm">
            Velocity (m/s)
          </div>
          <div className="absolute -bottom-6 left-0 w-full flex justify-between">
            <div className="text-xs">{axisLimits.xmin.toFixed(3)}</div>
            <div className="text-xs">{axisLimits.xmax.toFixed(3)}</div>
          </div>

          {plotRef.current && (
            <Application
              className="w-full h-full"
              width={plotDimensions.width}
              height={plotDimensions.height}
              background="white"
            >
              <pixiContainer>
                {/* Single graphics object for all lines */}
                <pixiGraphics draw={drawAllLines} />

                <pixiContainer>
                  {/* Hit areas for middle boundaries */}
                  {layers.map((layer, index) => (
                    <pixiGraphics
                      // key={`boundary-${index}`}
                      draw={(g: Graphics) => {
                        g.clear();
                        g.setFillStyle({ color: 0xffffff, alpha: 0 });
                        const y = coordinateHelpers.toScreenY(layer.endDepth);
                        g.rect(0, y - 10, plotDimensions.width, 20);
                        g.fill();
                      }}
                      eventMode="static"
                      cursor="ns-resize"
                      onpointerdown={(e: any) =>
                        handlePointerDown(e, index + 1, "boundary")
                      }
                    />
                  ))}

                  {/* Hit areas for velocity lines */}
                  {layers.map((layer, index) => (
                    <pixiGraphics
                      // key={`velocity-${index}`}
                      draw={(g: Graphics) => {
                        g.clear();
                        g.setFillStyle({ color: 0xffffff, alpha: 0 });
                        const x = coordinateHelpers.toScreenX(layer.velocity);
                        const startY = coordinateHelpers.toScreenY(layer.startDepth);
                        const endY = coordinateHelpers.toScreenY(layer.endDepth);
                        g.rect(x - 10, startY, 20, endY - startY);
                        g.fill();
                      }}
                      eventMode="static"
                      cursor="ew-resize"
                      onpointerdown={(e: any) =>
                        handlePointerDown(e, index, "velocity")
                      }
                    />
                  ))}
                </pixiContainer>
              </pixiContainer>
            </Application>
          )}

          {/* Tooltip */}
          {hoveredLine && (
            <div
              className="absolute bg-white border border-gray-300 rounded px-2 py-1 text-sm shadow-sm pointer-events-none"
              style={{
                left: (hoveredLine.x || 0) + 2,
                top: (hoveredLine.y || 0) - 2,
                transform: "translate(0, -100%)",
                zIndex: 1000,
              }}
            >
              {hoveredLine.type === "depth"
                ? `Depth: ${hoveredLine.value.toFixed(2)}`
                : `Velocity: ${hoveredLine.value.toFixed(2)}`}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-600">
            ASCE Version:
          </label>
          <select
            value={asceVersion}
            onChange={(e) => setAsceVersion(e.target.value)}
            className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
          >
            <option value="ASCE 7-22">ASCE 7-22</option>
            <option value="ASCE 7-16">ASCE 7-16</option>
          </select>
        </div>
      </div>
    </div>
  );
};
