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
import { Layer } from "../../types/data";
import { useDisper } from "../../context/DisperContext";
import { Window } from "../../types";
import { BasePlot } from "../../components/BasePlot/BasePlot";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useParams } from "react-router";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { addToast } from "../../store/slices/toastSlice";

extend({ Container, Sprite, Graphics, Text });

interface DragState {
  layerIndex: number;
  type: "boundary" | "velocity";
  isDragging: boolean;
}

const VELOCITY_MARGIN_FACTOR = 1.1; // 110% of max velocity

export const DisperModelManager = () => {
  const {
    state: { layers, asceVersion, displayUnits, modelAxisLimits },
    setLayers,
    splitLayer,
    deleteLayer,
    setAsceVersion,
    setModelAxisLimits,
    ToFeet,
    ToMeter,
  } = useDisper();

  const dispatch = useAppDispatch();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [plotDimensions, setPlotDimensions] = useState({
    width: 0,
    height: 0,
  });

  const plotRef = useRef<HTMLDivElement>(null);

  // Update coordinate helpers to use dynamic dimensions
  const coordinateHelpers = useMemo(
    () => ({
      toScreenX: (value: number) => {
        // Add 10px offset for the left margin
        return (
          ((value - modelAxisLimits.xmin) / (modelAxisLimits.xmax - modelAxisLimits.xmin)) *
          (plotDimensions.width)
        );
      },
      fromScreenX: (x: number) => {
        // Subtract the 10px offset and adjust for margin
        const adjustedX = Math.max(0, x);
        if (adjustedX <= 0) return modelAxisLimits.xmin;

        const value =
          modelAxisLimits.xmin +
          (adjustedX / (plotDimensions.width)) *
          (modelAxisLimits.xmax - modelAxisLimits.xmin);

        return Math.round(value * 10) / 10;
      },
      toScreenY: (value: number) => {
        // Add 10px offset for the top margin and subtract from height for bottom margin
        return (
          ((value - modelAxisLimits.ymin) / (modelAxisLimits.ymax - modelAxisLimits.ymin)) *
          (plotDimensions.height)
        );
      },
      fromScreenY: (y: number) => {
        // Subtract the 10px offset and adjust for margins
        const adjustedY = Math.max(0, y);
        if (adjustedY <= 0) return modelAxisLimits.ymin;

        const value =
          modelAxisLimits.ymin +
          (adjustedY / (plotDimensions.height)) *
          (modelAxisLimits.ymax - modelAxisLimits.ymin);

        return Math.round(value * 10) / 10;
      },
    }),
    [modelAxisLimits, plotDimensions]
  );

  // const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event?.target.files?.[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = (e: ProgressEvent<FileReader>) => {
  //       const text = e.target?.result as string;
  //       const lines = text.split("\n");
  //       const data = lines
  //         .map((line: string) => {
  //           const [depth, density, ignore, velocity] = line
  //             .trim()
  //             .split(" ")
  //             .map(Number);
  //           return { depth, density, ignore, velocity };
  //         })
  //         .filter((item) => !isNaN(item.depth) && !isNaN(item.velocity));

  //       if (data.length > 0) {
  //         // Create layers from consecutive points
  //         const newLayers: Layer[] = [];
  //         for (let i = 0; i < data.length - 1; i += 2) {
  //           const layer: Layer = {
  //             startDepth: i === 0 ? 0 : data[i].depth, // Force first layer to start at 0
  //             endDepth: data[i + 1].depth,
  //             velocity: data[i].velocity,
  //             density: data[i].density,
  //             ignore: data[i].ignore,
  //           };
  //           newLayers.push(layer);
  //         }

  //         // Update axis limits based on data
  //         const depthValues = data.map((d) => d.depth);
  //         const velocityValues = data.map((d) => d.velocity);
  //         const maxVelocity = Math.max(...velocityValues);

  //         const newmodelAxisLimits = {
  //           xmin: 0,
  //           xmax: Math.ceil(maxVelocity * VELOCITY_MARGIN_FACTOR), // Set max velocity to 110% of highest velocity
  //           ymin: 0,
  //           ymax: Math.ceil(Math.max(...depthValues)),
  //         };

  //         setLayers(newLayers);
  //         setModelAxisLimits(newmodelAxisLimits);
  //       }
  //     };
  //     reader.readAsText(file);
  //   }
  // };

  const handleUploadLayers = useCallback(async () => {
    try {
      const [fileHandle] = await (window as unknown as Window & { showOpenFilePicker: Function }).showOpenFilePicker({
        types: [
          {
            description: "Select Model file",
            accept: {
              "text/plain": [".txt"],
            },
          },
        ],
        multiple: false,
      });
      
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      const lines = content.trim().split('\n');
      const data = lines
        .map((line: string) => {
          const [depth, density, ignore, velocity] = line
            .trim()
            .split(" ")
            .map(Number);
          return { depth, density, ignore, velocity };
        })
        .filter((item:any) => !isNaN(item.depth) && !isNaN(item.velocity));

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
        const depthValues = data.map((d:any) => d.depth);
        const velocityValues = data.map((d:any) => d.velocity);
        const maxVelocity = Math.max(...velocityValues);

        const newmodelAxisLimits = {
          xmin: 0,
          xmax: Math.ceil(maxVelocity * VELOCITY_MARGIN_FACTOR), // Set max velocity to 110% of highest velocity
          ymin: 0,
          ymax: Math.ceil(Math.max(...depthValues)),
        };

        if (newLayers.length === 0) {
          dispatch(addToast({
            message: "No valid layers found in file",
            type: "warning",
            duration: 5000
          }));
          return;
        }
        setLayers(newLayers);
        setModelAxisLimits(newmodelAxisLimits);
        dispatch(addToast({
          message: `Successfully loaded ${newLayers.length} layers`,
          type: "success",
          duration: 5000
        }));
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  }, [dispatch]);

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
  
      const newLayers = layers.map(layer => ({...layer}));
  
      if (dragState.type === "velocity") {
        let newVelocity = coordinateHelpers.fromScreenX(x);
  
        if (x <= 10) {
          newVelocity = modelAxisLimits.xmin;
        }
  
        const constrainedVelocity = Math.max(
          modelAxisLimits.xmin,
          Math.min(modelAxisLimits.xmax, newVelocity)
        );
  
        newLayers[dragState.layerIndex] = {
          ...newLayers[dragState.layerIndex],
          velocity: constrainedVelocity
        };
        
        setLayers(newLayers);
  
        setTooltipContent(
          `Velocity: ${displayUnits === "ft"
            ? ToFeet(constrainedVelocity).toFixed(1)
            : constrainedVelocity.toFixed(1)
          } ${displayUnits}/s`
        );
      } else if (dragState.type === "boundary") {
        // Handle boundary drag (black line)
        const newDepth = coordinateHelpers.fromScreenY(y);

        // Determine the valid range for the current boundary
        let minDepth = 0;
        let maxDepth = modelAxisLimits.ymax;

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
  
        if (dragState.layerIndex === 0) {
          newLayers[0] = {
            ...newLayers[0],
            startDepth: constrainedDepth
          }
        } else if (dragState.layerIndex === layers.length) {
          newLayers[layers.length - 1] = {
            ...newLayers[layers.length - 1],
            endDepth: constrainedDepth
          };
        } else {
          newLayers[dragState.layerIndex - 1] = {
            ...newLayers[dragState.layerIndex - 1],
            endDepth: constrainedDepth
          };
          
          newLayers[dragState.layerIndex] = {
            ...newLayers[dragState.layerIndex],
            startDepth: constrainedDepth
          };
        }
  
        setLayers(newLayers);
        
        setTooltipContent(
          `Depth: ${displayUnits === "ft"
            ? ToFeet(constrainedDepth).toFixed(1)
            : constrainedDepth.toFixed(1)
          } ${displayUnits}`
        );
      }
    },
    [dragState, layers, coordinateHelpers, modelAxisLimits, displayUnits, ToFeet]
  );

  const handleHover = useCallback(
    (x: number, y: number) => {
      let found = false;

      // Check velocity lines
      layers.forEach((layer) => {
        const screenX = coordinateHelpers.toScreenX(layer.velocity);
        if (Math.abs(x - screenX) < 10) {
          setTooltipContent(
            `Velocity: ${displayUnits === "ft"
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
              `Depth: ${displayUnits === "ft"
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

      // For the last layer, use max(50, modelAxisLimits.ymax) as the end depth
      const endDepth =
        i === layers.length - 1 ? modelAxisLimits.ymax : current.endDepth;

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
  }, [layers, modelAxisLimits.ymax]);

  // Add click handler for the plot area
  const handlePlotClick = (event: React.PointerEvent) => {
    // If shift key is pressed, handle layer splitting
    // If alt key is pressed, handle layer deletion
    if (event.shiftKey || event.altKey) {
      if (layers.length > 0) {
        const rect = event.currentTarget.getBoundingClientRect();
        const y = event.clientY - rect.top;

        // Find which layer was clicked
        for (let i = 0; i < layers.length; i++) {
          const layer = layers[i];
          const startY = coordinateHelpers.toScreenY(layer.startDepth);
          const endY = coordinateHelpers.toScreenY(layer.endDepth);
  
          if (y >= startY && y <= endY) {
            const newDepth =
              modelAxisLimits.ymin +
              (y / plotDimensions.height) * (modelAxisLimits.ymax - modelAxisLimits.ymin);
  
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
    } 
    // If no modifier keys are pressed, update velocity
    else if (!dragState?.isDragging){
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert screen coordinates to plot values
      const clickVelocity = coordinateHelpers.fromScreenX(x);
      const clickDepth = coordinateHelpers.fromScreenY(y);
      
      // Find which layer was clicked
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (clickDepth >= layer.startDepth && 
            (i === layers.length - 1 || clickDepth <= layer.endDepth)) {
          
          const newLayers = layers.map((l, index) => {
            if (index === i) {
              return {
                ...l,
                velocity: Math.max(
                  modelAxisLimits.xmin,
                  Math.min(modelAxisLimits.xmax, clickVelocity)
                )
              };
            }
            return {...l};
          });
          
          // Update the layers
          setLayers(newLayers);
          break;
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
      const newLayers = layers.map((layer, index) => {
        if (index === layers.length - 1) {
          return { ...layer, endDepth: modelAxisLimits.ymax };
        }
        return { ...layer };
      });
      
      setLayers(newLayers);
    }
  }, [modelAxisLimits.ymax]);

  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      setPlotDimensions(dimensions);
    },
    []
  );

  return (
    <div className="card shadow-sm">
      <SectionHeader title="Dispersion Model"/>
      <div className="card-body">
        <div className="row g-4">
          <div className="col d-flex gap-5">
            {/* <FileControls
              onFileSelect={handleFileSelect}
              onDownload={handleDownloadLayers}
            /> */}
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={handleUploadLayers}
            >
              Upload Layers
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={handleDownloadLayers}
            >
              Download Layers
            </button>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="mb-2 d-flex">
              <label className="form-label w-50">
                Max Depth:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(modelAxisLimits.ymax)
                    : modelAxisLimits.ymax
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setModelAxisLimits({
                    ...modelAxisLimits,
                    ymax: valueInMeters,
                  });
                }}
                className="form-control form-control-sm w-50"
                step={displayUnits === "ft" ? "0.5" : "0.1"}
              />
            </div>
            <div className="mb-3 d-flex">
              <label className="form-label w-50">
                Min Depth:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(modelAxisLimits.ymin)
                    : modelAxisLimits.ymin
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setModelAxisLimits({
                    ...modelAxisLimits,
                    ymin: valueInMeters,
                  });
                }}
                className="form-control form-control-sm w-50"
                step={displayUnits === "ft" ? "0.5" : "0.1"}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3 d-flex">
              <label className="form-label w-50">
                Max Velocity:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(modelAxisLimits.xmax)
                    : modelAxisLimits.xmax
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setModelAxisLimits({
                    ...modelAxisLimits,
                    xmax: valueInMeters,
                  });
                }}
                className="form-control form-control-sm w-50"
                step={displayUnits === "ft" ? "1.0" : "0.5"}
              />
            </div>
            <div className="mb-3 d-flex">
              <label className="form-label w-50">
                Min Velocity:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(modelAxisLimits.xmin)
                    : modelAxisLimits.xmin
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) return;
                  const valueInMeters =
                    displayUnits === "ft" ? ToMeter(value) : value;
                  setModelAxisLimits({
                    ...modelAxisLimits,
                    xmin: valueInMeters,
                  });
                }}
                className="form-control form-control-sm w-50"
                min="0"
                step={displayUnits === "ft" ? "1.0" : "0.5"}
              />
            </div>
          </div>
        </div>
        <div className="row mb-4"></div>
        <div className="row">
          <div className="col">
            <div className="d-flex">
              <label className="form-label w-50">
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

        <div className="position-relative m-5">
          <BasePlot
            xLabel={`Velocity (${displayUnits}/s)`}
            yLabel={`Depth (${displayUnits})`}
            xMin={modelAxisLimits.xmin}
            xMax={modelAxisLimits.xmax}
            yMin={modelAxisLimits.ymax}
            yMax={modelAxisLimits.ymin}
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
                  // g.rect(10, 10, plotDimensions.width, plotDimensions.height);
                  // g.fill();

                  // Draw grid lines
                  g.setStrokeStyle({ width: 1, color: 0xeeeeee, alpha: 0.8 });

                  // Vertical grid lines (velocity)
                  const velocityStep = (modelAxisLimits.xmax - modelAxisLimits.xmin) / 10;
                  for (
                    let v = modelAxisLimits.xmin;
                    v <= modelAxisLimits.xmax;
                    v += velocityStep
                  ) {
                    const x = coordinateHelpers.toScreenX(v);
                    g.moveTo(x, 0);
                    g.lineTo(x, plotDimensions.height);
                  }

                  // Horizontal grid lines (depth)
                  const depthStep = (modelAxisLimits.ymax - modelAxisLimits.ymin) / 10;
                  for (
                    let d = modelAxisLimits.ymin;
                    d <= modelAxisLimits.ymax;
                    d += depthStep
                  ) {
                    const y = coordinateHelpers.toScreenY(d);
                    g.moveTo(0, y);
                    g.lineTo(plotDimensions.width, y);
                  }
                  g.stroke();
                }}
              />
              {layers.slice(0, -1).map((layer: any, index: number) => (
                <pixiContainer key={`boundary-container-${index}-${Date.now()}`}>
                  <pixiGraphics
                    key={`boundary-${index}-${Date.now()}`}
                    draw={(g) => {
                      g.clear();
                      g.setStrokeStyle({
                        width: 2,
                        color: 0x000000,
                        alignment: 0.5,
                      });
                      const y = Math.round(
                        coordinateHelpers.toScreenY(layer.endDepth)
                      );
                      g.moveTo(0, y);
                      g.lineTo(plotDimensions.width, y);
                      g.stroke();
                    }}
                    eventMode="static"
                    cursor="ns-resize"
                    hitArea={
                      new Rectangle(
                        10,
                        coordinateHelpers.toScreenY(layer.endDepth) - 5,
                        plotDimensions.width,
                        10
                      )
                    }
                    onPointerDown={(e: any) =>
                      handlePointerDown(e, index + 1, "boundary")
                    }
                  />
                  <pixiText
                    text={`${displayUnits === "ft"
                      ? ToFeet(layer.endDepth).toFixed(1)
                      : layer.endDepth.toFixed(1)
                    }`}
                    x={5}
                    y={coordinateHelpers.toScreenY(layer.endDepth) - 20}
                    style={
                      new TextStyle({
                        fontSize: 12,
                        fill: 0x000000,
                      })
                    }
                  />
                </pixiContainer>
              ))}

              {layers.map((layer: any, index: number) => (
                <pixiContainer key={`velocity-container-${index}-${Date.now()}`}>
                  <pixiGraphics
                    draw={(g) => {
                      g.clear();
                      // Fill the region to the left of the velocity line with light red
                      g.setFillStyle({ color: 0xff0000, alpha: 0.1 });
                      const x = Math.round(coordinateHelpers.toScreenX(layer.velocity));
                      const startY = Math.round(coordinateHelpers.toScreenY(layer.startDepth));
                      const endY = index === layers.length - 1
                        ? plotDimensions.height
                        : Math.round(coordinateHelpers.toScreenY(layer.endDepth));
                      
                      // Draw the filled rectangle from left edge to velocity line
                      g.rect(0, startY, x, endY - startY);
                      g.fill();
                      
                      // Draw the velocity line
                      g.setStrokeStyle({
                        width: 2,
                        color: 0xff0000,
                        alignment: 0.5,
                      });
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
                    onPointerDown={(e: any) =>
                      handlePointerDown(e, index, "velocity")
                    }
                  />
                  <pixiText
                    text={`${displayUnits === "ft"
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
      </div>
    </div>
  );
};
