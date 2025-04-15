import { Container, Sprite, Graphics, Text, Texture } from "pixi.js";
import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { extend } from "@pixi/react";
import { BasePlot } from "../../components/BasePlot/BasePlot";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectEnabledRecordCount, selectEnabledRecords } from "../../store/selectors/recordSelectors";
import { Window } from "../../types/index";
import { Matrix } from "../../types/record";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { addToast } from "../../store/slices/toastSlice";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { ColorMapManager } from "./ColorMapManager/ColorMapManager";

import { 
  addPoint, 
  removePoint,
  setHoveredPoint, 
  setIsDragging, 
  setDraggedPoint,
  setPlotDimensions,
  setIsLoading,
  addTransformation,
  setCoordinateMatrix,
  emptyTransformations,
} from "../../store/slices/plotSlice";
import { getMatrixShape } from "../../utils/matrix-util";
import { createTexture } from "../../utils/plot-util";
import { applyTransformation, areMatricesEqual } from "../../utils/matrix-util";
import { ORIGINAL_COORDINATE_MATRIX } from "../../utils/plot-util";
import { PickData } from "../../types/data";

extend({ Container, Sprite, Graphics, Text });

export default function MainPlot() {
  const dispatch = useAppDispatch();
  const enabledRecords = useAppSelector(selectEnabledRecords);
  const enabledRecordCount = useAppSelector(selectEnabledRecordCount);

  const { 
    selectedColorMap, 
    colorMaps,
    isLoading, 
    points, 
    hoveredPoint, 
    isDragging, 
    draggedPoint, 
    plotDimensions,
    coordinateMatrix,
    dataLimits,
    transformations
  } = useAppSelector((state) => state.plot);
  
  const plotRef = useRef<any>(null);
  
  const [texture, setTexture] = useState<Texture | null>(null);

  const [tooltipContent, setTooltipContent] = useState<string>('');
  
  const selectAxisValue = useCallback((axisKey:number) =>{
    switch(axisKey) {
      case 1:
        return dataLimits.slowMin;
      case 2:
        return dataLimits.slowMax;
      case -2:
        return dataLimits.freqMin;
      case -1:
        return dataLimits.freqMax;
      default:
        return 0;
    }
  }, [dataLimits, coordinateMatrix])
  
  const left = useCallback(() => selectAxisValue(coordinateMatrix[1][0]), [dataLimits, coordinateMatrix]);
  const right = useCallback(() => selectAxisValue(coordinateMatrix[1][2]), [dataLimits, coordinateMatrix]);
  const bottom = useCallback(() => selectAxisValue(coordinateMatrix[2][1]), [dataLimits, coordinateMatrix]);
  const top = useCallback(() => selectAxisValue(coordinateMatrix[0][1]), [dataLimits, coordinateMatrix]);
  const isAxisSwapped = useCallback(() => coordinateMatrix[1][0] < 0, [dataLimits, coordinateMatrix]);

  const isFlippedHorizontal = useCallback(() => coordinateMatrix[1][0] < coordinateMatrix[1][2], [coordinateMatrix]);
  const isFlippedVertical = useCallback(() => coordinateMatrix[0][1] < coordinateMatrix[2][1], [coordinateMatrix]);
  
  const coordinateHelpers = useMemo(
    () => ({
      toScreenX: (value: number) => {
        if (isAxisSwapped()) {
          return !isFlippedHorizontal()
            ? plotDimensions.width - 
              ((value - dataLimits.freqMin) / (dataLimits.freqMax - dataLimits.freqMin)) * 
              plotDimensions.width
            : ((value - dataLimits.freqMin) / (dataLimits.freqMax - dataLimits.freqMin)) * 
              plotDimensions.width;
        } else {
          return !isFlippedHorizontal()
            ? plotDimensions.width - 
              ((value - dataLimits.slowMin) / (dataLimits.slowMax - dataLimits.slowMin)) * 
              plotDimensions.width
            : ((value - dataLimits.slowMin) / (dataLimits.slowMax - dataLimits.slowMin)) * 
              plotDimensions.width;
        }
      },
      fromScreenX: (x: number) => {
        const value =
          isFlippedHorizontal()
            ? right() +
              ((plotDimensions.width - x) / plotDimensions.width) *
                (left() - right())
            : left() + (x / plotDimensions.width) * (right() - left());

        return Math.round(value * 1000000) / 1000000;
      },
      toScreenY: (value: number) => {
        if (isAxisSwapped()) {
          return !isFlippedVertical()
            ? plotDimensions.height - 
              ((value - dataLimits.slowMin) / (dataLimits.slowMax - dataLimits.slowMin)) * 
              plotDimensions.height
            : ((value - dataLimits.slowMin) / (dataLimits.slowMax - dataLimits.slowMin)) * 
              plotDimensions.height;
        } else {
          return !isFlippedVertical()
            ? plotDimensions.height - 
              ((value - dataLimits.freqMin) / (dataLimits.freqMax - dataLimits.freqMin)) * 
              plotDimensions.height
            : ((value - dataLimits.freqMin) / (dataLimits.freqMax - dataLimits.freqMin)) * 
              plotDimensions.height;
        }
      },
      fromScreenY: (y: number) => {
        const value =
          isFlippedVertical()
            ? bottom() +
              ((plotDimensions.height - y) / plotDimensions.height) *
                (top() - bottom())
            : top() + (y / plotDimensions.height) * (bottom() - top());

        return Math.round(value * 1000000) / 1000000;
      },
    }),
    [dataLimits, plotDimensions, coordinateMatrix, isAxisSwapped, isFlippedHorizontal, isFlippedVertical]
  );

  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      dispatch(setPlotDimensions(dimensions));
    },
    [dispatch]
  );

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

    if ((event.nativeEvent && event.nativeEvent.shiftKey) || event.shiftKey) {
      const slow = isAxisSwapped() 
        ? coordinateHelpers.fromScreenY(y) 
        : coordinateHelpers.fromScreenX(x);
      const freq = isAxisSwapped() 
        ? coordinateHelpers.fromScreenX(x) 
        : coordinateHelpers.fromScreenY(y);
      
      console.log("Adding new point at coordinates:", { slow, freq });
      const newPoint:PickData = {
        d1: 0,
        d2: 0,
        frequency: freq,
        d3: 0,
        slowness: slow,
        d4: 0,
        d5: 0
      }
      dispatch(addPoint(newPoint));
      return;
    }
    
    const clickedPointIndex = points.findIndex(point => {
      // Convert slow/freq to screen coordinates for comparison
      const screenX = isAxisSwapped() 
        ? coordinateHelpers.toScreenX(point.frequency) 
        : coordinateHelpers.toScreenX(point.slowness);
      const screenY = isAxisSwapped() 
        ? coordinateHelpers.toScreenY(point.slowness) 
        : coordinateHelpers.toScreenY(point.frequency);
      
      const distance = Math.sqrt(
        Math.pow(screenX - x, 2) + Math.pow(screenY - y, 2)
      );
      return distance < 10;
    });
    
    if (clickedPointIndex !== -1) {
      const clickedPoint = points[clickedPointIndex];
      
      if ((event.nativeEvent && event.nativeEvent.altKey) || event.altKey) {
        console.log("Removing point:", clickedPoint);
        dispatch(removePoint(clickedPoint));
      } else {
        console.log("Starting drag on point:", clickedPoint);
        dispatch(setDraggedPoint(clickedPoint));
        dispatch(setIsDragging(true));
      }
    }
  }, [points, dispatch, plotRef, coordinateHelpers]);
  
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
    
    if (isDragging && draggedPoint) {
      // Convert screen coordinates to slow/freq values
      const slow = isAxisSwapped() 
        ? coordinateHelpers.fromScreenY(y) 
        : coordinateHelpers.fromScreenX(x);
      const freq = isAxisSwapped() 
        ? coordinateHelpers.fromScreenX(x) 
        : coordinateHelpers.fromScreenY(y);
      
      // Update the dragged point position
      dispatch(removePoint(draggedPoint));
      const newPoint:PickData = {
        d1: 0,
        d2: 0,
        frequency: freq,
        d3: 0,
        slowness: slow,
        d4: 0,
        d5: 0
      };
      dispatch(addPoint(newPoint));
      dispatch(setDraggedPoint(newPoint));
      
      // Update tooltip content for dragged point
      setTooltipContent(`(Slow:${slow.toFixed(6)}, Freq:${freq.toFixed(6)})`);
    } else {
      // Check for hovering over points
      const hovered = points.find(point => {
        // Convert slow/freq to screen coordinates for comparison
        const screenX = isAxisSwapped() 
          ? coordinateHelpers.toScreenX(point.frequency) 
          : coordinateHelpers.toScreenX(point.slowness);
        const screenY = isAxisSwapped() 
          ? coordinateHelpers.toScreenY(point.slowness) 
          : coordinateHelpers.toScreenY(point.frequency);
        
        const distance = Math.sqrt(
          Math.pow(screenX - x, 2) + Math.pow(screenY - y, 2)
        );
        return distance < 10;
      });
      
      dispatch(setHoveredPoint(hovered || null));
      
      // Update tooltip content for hovered point
      if (hovered) {
        setTooltipContent(`(Slow:${hovered.slowness.toFixed(6)}, Freq:${hovered.frequency.toFixed(6)})`);
      } else {
        setTooltipContent('');
      }
    }
  }, [isDragging, draggedPoint, points, dispatch, plotRef, coordinateHelpers, isAxisSwapped]);
  
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
    
    const pointsData = points.map(p => `${p.d1.toFixed(6)},${p.d2.toFixed(6)}, ${p.frequency.toFixed(6)}, ${p.d3.toFixed(6)}, ${p.slowness.toFixed(6)}, ${p.d4.toFixed(6)}, ${p.d5.toFixed(6)}`).join('\n');
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
  }, [points, dispatch]);

  useEffect(() => {
    
    if (enabledRecordCount === 0) {
      setTexture(null);
      dispatch(setIsLoading(false));
      return;
    }
    
    dispatch(setIsLoading(true));
    
    console.log("Transformations Changed", transformations);
    console.log("Before:", coordinateMatrix);
    let newCoordinate = applyTransformation(ORIGINAL_COORDINATE_MATRIX, transformations);
    if (transformations.length !== 0 && areMatricesEqual(newCoordinate, ORIGINAL_COORDINATE_MATRIX)) {
      dispatch(emptyTransformations());
      console.log("The transforms is reset");
    }
    console.log("New:", newCoordinate);
    dispatch(setCoordinateMatrix(newCoordinate));
    // Create weighted texture from selected records
    const createWeightedTexture = async () => {
      try {
        const totalWeight = enabledRecords.reduce(
          (total: number, item) => total + item.weight,
          0
        );
        if (totalWeight === 0) {
          dispatch(addToast({ message: "Total weight is 0, cannot create weighted texture", type: "warning", duration: 5000 }));
          return;
        }
        // Get the dimensions from the first record
        const shape = getMatrixShape(enabledRecords[0].data as Matrix);
        const width = shape[1];
        const height = shape[0];
       
        // Create empty matrix with proper dimensions
        let mainMatrix: Matrix = Array.from(
          { length: height }, 
          () => Array(width).fill(0)
        );

        // Properly accumulate weighted values
        for (const record of enabledRecords) {
          const recordMatrix = record.data as Matrix;
          
          for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
              mainMatrix[i][j] += recordMatrix[i][j] * record.weight / totalWeight;
            }
          }
        }
        if (mainMatrix.length === 0) {
          dispatch(addToast({ message: "No data to create texture", type: "warning", duration: 5000 }));
          return;
        }
        if (transformations.length !== 0) {
          mainMatrix = applyTransformation(mainMatrix, transformations);
        }
        // Calculate min/max from the weighted data for better visualization
        const flatMatrix = mainMatrix.flat();
        const min = Math.min(...flatMatrix);
        const max = Math.max(...flatMatrix);
        // Convert back to flat array for texture creation
        const mainRecord = flatMatrix;
        const newTexture = createTexture(
          mainRecord,
          enabledRecords[0].dimensions,
          { min, max }, // Use calculated min/max instead of from first record
          colorMaps[selectedColorMap]
        );
        
        setTexture(newTexture);
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
  }, [enabledRecords, selectedColorMap, colorMaps, dispatch, transformations]);

  useEffect(() => {
    console.log("Coordinates:", coordinateMatrix)
    console.log("Points:", points)
    console.log("Tooltip:", tooltipContent)
  }, [coordinateMatrix, points, tooltipContent])

  return (
    <div className="card shadow-sm mb-4">
      <SectionHeader title="Main Plot">
      </SectionHeader>
      <div className="card-body p-0">
        <div className="row g-0">
          <div className="col-lg-9">
            <div className="aspect-ratio-container">
              <div className="plot-container">
                {isLoading ? (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : texture ? (
                  <BasePlot
                    ref={plotRef}
                    xLabel={isAxisSwapped() ? "Frequency" : "Slowness"}
                    yLabel={isAxisSwapped() ? "Slowness" : "Frequency"}
                    xMax={right()}
                    xMin={left()}
                    yMin={bottom()}
                    yMax={top()}
                    display={(value) => value.toFixed(3)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerDown={handlePointerDown}
                    onDimensionChange={handleDimensionChange}
                    tooltipContent={tooltipContent}
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

                          points.forEach((point) => {
                            const isHovered = hoveredPoint === point;
                            const isDragged = draggedPoint === point;
                            
                            const screenX = isAxisSwapped() 
                              ? coordinateHelpers.toScreenX(point.frequency) 
                              : coordinateHelpers.toScreenX(point.slowness);
                            const screenY = isAxisSwapped() 
                              ? coordinateHelpers.toScreenY(point.slowness) 
                              : coordinateHelpers.toScreenY(point.frequency);
                            
                            g.setFillStyle({
                              color: isHovered || isDragged ? 0x00ff00 : 0xff0000,
                              alpha: 0.8,
                            });
                            
                            g.circle(
                              screenX,
                              screenY,
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
                <ColorMapManager/>
              </div>

              {/* Transform Controls */}
              <div className="mb-3">
                <label className="form-label">Transform</label>
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                <button
                  onClick={() => {
                    dispatch(addTransformation("rotateCounterClockwise"));
                  }}
                  className="btn btn-outline-primary btn-sm"
                  title="Rotate Counter-clockwise"
                  disabled={isLoading || !texture}
                >
                  <span>↺</span>
                </button>
                <button
                  onClick={() => {
                    dispatch(addTransformation("rotateClockwise"));
                  }}
                  className="btn btn-outline-primary btn-sm"
                  title="Rotate Clockwise"
                  disabled={isLoading || !texture}
                >
                  <span>↻</span>
                </button>
                <button
                  onClick={() => {
                    isAxisSwapped()? dispatch(addTransformation("flipHorizontal")):dispatch(addTransformation("flipVertical"));
                  }}
                  className="btn btn-outline-primary btn-sm"
                  title="Flip Horizontal"
                  disabled={isLoading || !texture}
                >
                  <span>↔</span>
                </button>
                <button
                  onClick={() => {
                    isAxisSwapped()? dispatch(addTransformation("flipVertical")):dispatch(addTransformation("flipHorizontal"));
                  }}
                  className="btn btn-outline-primary btn-sm"
                  title="Flip Vertical"
                  disabled={isLoading || !texture}
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
