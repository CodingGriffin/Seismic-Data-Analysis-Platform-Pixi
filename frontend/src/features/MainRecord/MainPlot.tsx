import { Container, Sprite, Graphics, Text, Texture } from "pixi.js";
import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { extend } from "@pixi/react";
import { BasePlot } from "../../components/BasePlot/BasePlot";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectRecordItems } from "../../store/selectors/recordSelectors";
import { createTexture } from "../../utils/plot-util";
import { Window } from "../../types";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { addToast } from "../../store/slices/toastSlice";
import { 
  setSelectedColorMap, 
  setTexture, 
  setIsLoading,
  addPoint, 
  removePoint,
  setHoveredPoint, 
  setIsDragging, 
  setDraggedPoint, 
  updateAxisLimits,
  setPlotDimensions
} from "../../store/slices/plotSlice";
import { ColorMapKey } from "../../utils/record-util";

extend({ Container, Sprite, Graphics, Text });

export default function MainPlot() {
  const dispatch = useAppDispatch();
  const { itemsMap, orderedIds } = useAppSelector(selectRecordItems);
  const { 
    selectedColorMap, 
    colorMaps,
    isLoading, 
    points, 
    hoveredPoint, 
    isDragging, 
    draggedPoint, 
    axisLimits,
    plotDimensions 
  } = useAppSelector((state) => state.plot);
  
  const plotRef = useRef<any>(null);

  // Add a local state for texture instead of using Redux
  const [localTexture, setLocalTexture] = useState<Texture | null>(null);

  const coordinateHelpers = useMemo(() => {
    return {
      fromScreenX: (x: number) => {
        const { xmin, xmax } = axisLimits;
        return xmin + (x / plotDimensions.width) * (xmax - xmin);
      },
      fromScreenY: (y: number) => {
        const { ymin, ymax } = axisLimits;
        return ymax - (y / plotDimensions.height) * (ymax - ymin);
      },
      toScreenX: (x: number) => {
        const { xmin, xmax } = axisLimits;
        return ((x - xmin) / (xmax - xmin)) * plotDimensions.width;
      },
      toScreenY: (y: number) => {
        const { ymin, ymax } = axisLimits;
        return ((ymax - y) / (ymax - ymin)) * plotDimensions.height;
      }
    };
  }, [plotDimensions, axisLimits]);

  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      dispatch(setPlotDimensions(dimensions));
    },
    [dispatch]
  );

  useEffect(() => {
    const selectedRecords = orderedIds
      .filter(id => itemsMap[id].enabled)
      .map(id => ({
        data: itemsMap[id].data,
        weight: itemsMap[id].weight,
        dimensions: itemsMap[id].dimensions,
        min: itemsMap[id].min,
        max: itemsMap[id].max
      }));
    
    if (selectedRecords.length === 0) {
      dispatch(setTexture(null));
      dispatch(setIsLoading(false));
      return;
    }
    
    dispatch(setIsLoading(true));
    
    // Create weighted texture from selected records
    const createWeightedTexture = async () => {
      try {
        const totalWeight = selectedRecords.reduce(
          (total: number, item) => total + item.weight,
          0
        );
        console.log("Totalweight:", totalWeight);
        
        // Initialize array with zeros
        let mainRecord: number[] = new Array(selectedRecords[0].data.flat().length).fill(0);

        // Properly accumulate weighted values
        for (const record of selectedRecords) {
          const flatData = record.data.flat();
          flatData.forEach((value: number, index: number) => {
            // This is the key fix - use += to actually update the array
            mainRecord[index] += value * record.weight / totalWeight;
          });
        }
        
        console.log("first record:", selectedRecords[0].data.flat());
        console.log("Creating new texture for main plot", mainRecord);

        // Calculate min/max from the weighted data for better visualization
        const min = Math.min(...mainRecord);
        const max = Math.max(...mainRecord);

        const newTexture = createTexture(
          mainRecord,
          selectedRecords[0].dimensions,
          { min, max }, // Use calculated min/max instead of from first record
          colorMaps[selectedColorMap]
        );
        
        setLocalTexture(newTexture);
      } catch (error) {
        console.error("Error creating texture:", error);
        dispatch(addToast({
          message: "Failed to create texture from data",
          type: "error",
          duration: 7000
        }));
      } finally {
        dispatch(setIsLoading(false));
      }
    };
    
    createWeightedTexture();
  }, [itemsMap, orderedIds, selectedColorMap, colorMaps, dispatch]);

  const handlePointerDown = useCallback((event: any) => {
    console.log("PointerDown event:", event);
    
    let x, y;
    
    if (event.data && event.data.global) {
      // PixiJS event
      x = event.data.global.x;
      y = event.data.global.y;
    } else if (event.clientX !== undefined && event.clientY !== undefined) {
      // DOM event
      const rect = plotRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else {
      console.error("Unknown event format:", event);
      return;
    }
    
    console.log("Calculated coordinates:", { x, y });
    
    // Add new point with Shift key
    if ((event.nativeEvent && event.nativeEvent.shiftKey) || event.shiftKey) {
      console.log("Adding new point at:", { x, y });
      const newPoint = { x, y };
      dispatch(addPoint(newPoint));
      return;
    }
    
    // Check if clicking on an existing point
    const clickedPoint = points.find(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
      );
      return distance < 10; // 10px radius for clicking on a point
    });
    
    if (clickedPoint) {
      if ((event.nativeEvent && event.nativeEvent.altKey) || event.altKey) {
        // Remove point with Alt key
        console.log("Removing point:", clickedPoint);
        dispatch(removePoint(clickedPoint));
      } else {
        // Start dragging
        console.log("Starting drag on point:", clickedPoint);
        dispatch(setDraggedPoint(clickedPoint));
        dispatch(setIsDragging(true));
      }
    }
  }, [points, dispatch, plotRef]);
  
  const handlePointerMove = useCallback((event: any) => {
    let x, y;
    
    if (event.data && event.data.global) {
      // PixiJS event
      x = event.data.global.x;
      y = event.data.global.y;
    } else if (event.clientX !== undefined && event.clientY !== undefined) {
      // DOM event
      const rect = plotRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else {
      return; // Unknown event format
    }
    
    // Update cursor position for tooltip
    setCursorPosition({ x, y });
    
    if (isDragging && draggedPoint) {
      // Update the dragged point position
      dispatch(removePoint(draggedPoint));
      dispatch(addPoint({ x, y }));
      dispatch(setDraggedPoint({ x, y }));
      
      // Update tooltip content for dragged point
      setTooltipContent(
        isAxisSwapped()
          ? `(Freq:${coordinateHelpers.fromScreenX(x).toFixed(6)}, Slow:${coordinateHelpers.fromScreenY(y).toFixed(6)})`
          : `(Dist:${coordinateHelpers.fromScreenX(x).toFixed(6)}, Depth:${coordinateHelpers.fromScreenY(y).toFixed(6)})`
      );
    } else {
      // Check for hovering over points
      const hovered = points.find(point => {
        const distance = Math.sqrt(
          Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
        );
        return distance < 10;
      });
      
      dispatch(setHoveredPoint(hovered || null));
      
      // Update tooltip content for hovered point
      if (hovered) {
        setTooltipContent(
          isAxisSwapped()
            ? `(Freq:${coordinateHelpers.fromScreenX(hovered.x).toFixed(6)}, Slow:${coordinateHelpers.fromScreenY(hovered.y).toFixed(6)})`
            : `(Dist:${coordinateHelpers.fromScreenX(hovered.x).toFixed(6)}, Depth:${coordinateHelpers.fromScreenY(hovered.y).toFixed(6)})`
        );
      } else {
        setTooltipContent('');
      }
    }
  }, [isDragging, draggedPoint, points, dispatch, plotRef, coordinateHelpers]);
  
  const handlePointerUp = useCallback(() => {
    dispatch(setIsDragging(false));
    dispatch(setDraggedPoint(null));
  }, [dispatch]);

  const handleSavePoints = useCallback(() => {
    if (points.length === 0) {
      dispatch(addToast({
        message: "No points to save",
        type: "warning",
        duration: 5000
      }));
      return;
    }
    
    // Convert screen coordinates to data coordinates
    const dataPoints = points.map(point => ({
      x: coordinateHelpers.fromScreenX(point.x),
      y: coordinateHelpers.fromScreenY(point.y)
    }));
    
    // Create a blob with the points data
    const pointsData = dataPoints.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join('\n');
    const blob = new Blob([pointsData], { type: 'text/plain' });
    
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
      console.error("Error saving file:", err);
      dispatch(addToast({
        message: "Failed to save file. Please try again.",
        type: "error",
        duration: 5000
      }));
      
      // Fallback to download link if native file picker fails
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plotted_points.pck";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [points, coordinateHelpers, dispatch]);

  const isAxisSwapped = useCallback(() => {
    // Logic to determine if axes are swapped
    return false;
  }, []);

  const left = useCallback(() => axisLimits.xmin, [axisLimits]);
  const right = useCallback(() => axisLimits.xmax, [axisLimits]);
  const bottom = useCallback(() => axisLimits.ymin, [axisLimits]);
  const top = useCallback(() => axisLimits.ymax, [axisLimits]);

  // Add state for tooltip
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Main Plot</h5>
      </div>
      <div className="card-body p-0">
        <div className="row g-0">
          <div className="col-lg-9">
            <div className="aspect-ratio-container" style={{ aspectRatio: '4/3' }}>
              <div className="plot-container">
                {isLoading ? (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : localTexture ? (
                  <BasePlot
                    ref={plotRef}
                    xLabel="Distance"
                    yLabel="Depth"
                    xMax={axisLimits.xmax}
                    xMin={axisLimits.xmin}
                    yMin={axisLimits.ymin}
                    yMax={axisLimits.ymax}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerDown={handlePointerDown}
                    onDimensionChange={handleDimensionChange}
                    tooltipContent={tooltipContent}
                    // cursorPosition={cursorPosition}
                  >
                    <pixiContainer>
                      {localTexture && (
                        <pixiSprite
                          texture={localTexture}
                          width={plotDimensions.width}
                          height={plotDimensions.height}
                          anchor={0}
                        />
                      )}
                      <pixiGraphics
                        draw={(g) => {
                          g.clear();

                          points.forEach((point) => {
                            const isHovered = hoveredPoint === point;
                            const isDragged = draggedPoint === point;

                            g.setFillStyle({color:isHovered || isDragged ? 0x00ff00 : 0xff0000, alpha:0.8});
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
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <p className="text-muted">No data selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Controls Panel */}
          <div className="col-lg-3 border-start">
            <div className="p-3">
              <h6 className="mb-3">Plot Controls</h6>
              
              {/* ColorMap Controls */}
              <div className="mb-3">
                <label className="form-label">Color Map</label>
                <div className="d-flex gap-2 mb-3">
                  <select
                    value={selectedColorMap}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (Object.keys(colorMaps).includes(value)) {
                        dispatch(setSelectedColorMap(value as ColorMapKey));
                      }
                    }}
                    className="form-select form-select-sm flex-grow-1"
                  >
                    {Object.keys(colorMaps).map((mapName) => (
                      <option key={mapName} value={mapName}>
                        {mapName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transform Controls */}
              <div className="mb-3">
                <label className="form-label">Transform</label>
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                  <button
                    // onClick={() => {
                    //   setLoading(true);
                    //   setImageTransform({
                    //     type: "rotationCounterClockwise",
                    //     rectSize: plotDimensions,
                    //   });
                    // }}
                    className="btn btn-outline-primary btn-sm"
                    title="Rotate Counter-clockwise"
                  >
                    <span>↺</span>
                  </button>
                  <button
                    // onClick={() => {
                    //   setLoading(true);
                    //   setImageTransform({
                    //     type: "rotationClockwise",
                    //     rectSize: plotDimensions,
                    //   });
                    // }}
                    className="btn btn-outline-primary btn-sm"
                    title="Rotate Clockwise"
                  >
                    <span>↻</span>
                  </button>
                  <button
                    // onClick={() => {
                    //   setLoading(true);
                    //   setImageTransform({
                    //     type: "flipHorizontal",
                    //     rectSize: plotDimensions,
                    //   });
                    // }}
                    className="btn btn-outline-primary btn-sm"
                    title="Flip Horizontal"
                  >
                    <span>↔</span>
                  </button>
                  <button
                    // onClick={() => {
                    //   setLoading(true);
                    //   setImageTransform({
                    //     type: "flipVertical",
                    //     rectSize: plotDimensions,
                    //   });
                    // }}
                    className="btn btn-outline-primary btn-sm"
                    title="Flip Vertical"
                  >
                    <span>↕</span>
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="d-grid gap-2 mt-4">
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleSavePoints}
                  disabled={points.length === 0}
                >
                  Download Points
                </button>
              </div>
              
              {/* Points Info */}
              {points.length > 0 && (
                <div className="mt-3">
                  <small className="text-muted d-block mb-1">
                    {points.length} point{points.length !== 1 ? 's' : ''} added
                  </small>
                  <small className="text-muted d-block">
                    Shift+Click: Add point<br/>
                    Alt+Click: Remove point
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
