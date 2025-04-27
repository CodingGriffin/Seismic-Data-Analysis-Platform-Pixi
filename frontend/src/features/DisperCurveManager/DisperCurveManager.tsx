import { extend } from "@pixi/react";
import { Graphics, Container } from "pixi.js";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Point } from "../../types/data";
import { PickData } from "../../types/data";
import { CalcCurve } from "../../utils/disper-util";
import VelModel from "../../utils/disper-util";
import { useDisper } from "../../context/DisperContext";
import { BasePlot } from "../../components/BasePlot/BasePlot";
import { FileControls } from "../../components/FileControls/FileControls";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { addToast } from "../../store/slices/toastSlice";

extend({ Graphics, Container });

const VELOCITY_MAX_MARGIN_FACTOR = 1.1; // 110% of max velocity
const VELOCITY_MIN_MARGIN_FACTOR = 0.9; // 90% of min velocity
const ABS_MIN_VELOCITY = 0.0000000001;
const ABS_MIN_PERIOD = 0.0000000001;
const ABS_MIN_SLOWNESS = 0.0000000001;
const ABS_MIN_FREQUENCY = 0.0000000001;

export const DisperCurveManager = () => {
  const {
    state: { 
      layers, 
      displayUnits, 
      pickData, 
      asceVersion, 
      dataLimits, 
      curveAxisLimits,
      numPoints,
      rmseVel,
      vs30,
      siteClass,
      velocityUnit,
      periodUnit,
      velocityReversed,
      periodReversed,
      axesSwapped
     },
    ToMeter,
    ToFeet,
    setPickData,
    setCurveAxisLimits,
    setNumPoints,
    setRmseVel,
    setVs30,
    setSiteClass,
    setVelocityUnit,
    setPeriodUnit,
    setVelocityReversed,
    setPeriodReversed,
    setAxesSwapped
  } = useDisper();

  const dispatch = useAppDispatch();
  const [curvePoints, setCurvePoints] = useState<Point[]>([]);
  const [pickPoints, setPickPoints] = useState<Point[]>([]);
  const [tooltipContent, setTooltipContent] = useState<string>("");

  const [hoveredPoint, setHoveredPoint] = useState<Point | undefined>(
    undefined
  );
  
  const [plotDimensions, setPlotDimensions] = useState({
    width: 640,
    height: 480,
  });
  
  const plotRef = useRef<any>(null);

  const coordinateHelpers = useMemo(
    () => ({
      toScreenX: (value: number) => {
        return (
          ((value - curveAxisLimits.xmin) / (curveAxisLimits.xmax - curveAxisLimits.xmin)) *
          (plotDimensions.width)
        );
      },
      fromScreenX: (x: number) => {
        const adjustedX = Math.max(0, x);
        if (adjustedX <= 0) return curveAxisLimits.xmin;

        const value =
          curveAxisLimits.xmin +
          (adjustedX / (plotDimensions.width)) *
          (curveAxisLimits.xmax - curveAxisLimits.xmin);

        return Math.round(value * 10000) / 10000;
      },
      toScreenY: (value: number) => {
        return (
          ((value - curveAxisLimits.ymin) / (curveAxisLimits.ymax - curveAxisLimits.ymin)) *
          (plotDimensions.height)
        );
      },
      fromScreenY: (y: number) => {
        const adjustedY = Math.max(0, y);
        if (adjustedY <= 0) return curveAxisLimits.ymin;

        const value =
          curveAxisLimits.ymin +
          (adjustedY / (plotDimensions.height)) *
          (curveAxisLimits.ymax - curveAxisLimits.ymin);

        return Math.round(value * 10000) / 10000;
      },
    }),
    [curveAxisLimits, plotDimensions]
  );

  const convertUnit = (value: number, from: string, to: string): number => {
    if (from === to) return value;
    if (value === 0) return 0;

    // Handle period/frequency conversion
    if (
      (from === "period" && to === "frequency") ||
      (from === "frequency" && to === "period")
    ) {
      return 1 / value;
    }

    // Handle velocity/slowness conversion
    if (
      (from === "velocity" && to === "slowness") ||
      (from === "slowness" && to === "velocity")
    ) {
      return 1 / value;
    }

    return value;
  };

  const convertToPlotPoints = (
    rawData: PickData[],
    currentPeriodUnit: "period" | "frequency",
    currentVelocityUnit: "velocity" | "slowness"
  ): Point[] => {
    return rawData
      .map((data) => {
        const periodValue =
          currentPeriodUnit === "frequency"
            ? data.frequency
            : convertUnit(data.frequency, "frequency", "period");

        const velocityValue =
          currentVelocityUnit === "slowness"
            ? data.slowness
            : convertUnit(data.slowness, "slowness", "velocity");

        return axesSwapped
          ? { x: velocityValue, y: periodValue }
          : { x: periodValue, y: velocityValue };
      })
      .filter(
        (point) =>
          !isNaN(point.x) && !isNaN(point.y) && point.x > 0 && point.y > 0
      )
      .sort((a, b) => a.x - b.x);
  };

  // Helper function to generate evenly spaced points
  const generateEvenlySpacedPoints = (
    min: number,
    max: number,
    count: number
  ): number[] => {
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  // const handleFileSelect = async (
  //   event: React.ChangeEvent<HTMLInputElement>
  // ) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   const text = await file.text();
  //   const rawData: PickData[] = text
  //     .split("\n")
  //     .map((line) => line.trim())
  //     .filter((line) => line.length > 0)
  //     .map((line) => {
  //       const [d1, d2, frequency, d3, slowness, d4, d5] = line
  //         .split(/\s+/)
  //         .map((num) => parseFloat(num.trim()));

  //       return {
  //         d1,
  //         d2,
  //         frequency,
  //         d3,
  //         slowness,
  //         d4,
  //         d5,
  //       };
  //     });
  //   setPickData(rawData);
  // };

  const handleUploadPoints = useCallback(async () => {
    try {
      const [fileHandle] = await (window as unknown as Window & { showOpenFilePicker: Function }).showOpenFilePicker({
        types: [
          {
            description: "Picked Points",
            accept: {
              "text/plain": [".pck"],
            },
          },
        ],
        multiple: false,
      });
      
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      const lines = content.trim().split('\n');
      const newPoints: PickData[] = [];
      
      for (const line of lines) {
        const values = line.split(' ').map((val:any) => parseFloat(val.trim()));
        
        if (values.length >= 7) {
          const point: PickData = {
            d1: values[0],
            d2: values[1],
            frequency: values[2],
            d3: values[3],
            slowness: values[4],
            d4: values[5],
            d5: values[6]
          };
          newPoints.push(point);
        }
      }
      
      if (newPoints.length === 0) {
        dispatch(addToast({
          message: "No valid points found in file",
          type: "warning",
          duration: 5000
        }));
        return;
      }
      setPickData(newPoints)
      dispatch(addToast({
        message: `Successfully loaded ${newPoints.length} points`,
        type: "success",
        duration: 5000
      }));
      
    } catch (err) {
      console.error("Error uploading file:", err);
      
      if ((err as Error).name !== 'AbortError') {
        dispatch(addToast({
          message: "Failed to upload file. Please try again.",
          type: "error",
          duration: 5000
        }));
      }
      
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pck';
        
        input.onchange = async (e) => {
          const target = e.target as HTMLInputElement;
          if (!target.files || target.files.length === 0) return;
          
          const file = target.files[0];
          const reader = new FileReader();
          
          reader.onload = (event) => {
            const content = event.target?.result as string;
            const lines = content.trim().split('\n');
            const newPoints: PickData[] = [];
            
            for (const line of lines) {
              const values = line.split(',').map(val => parseFloat(val.trim()));
              
              if (values.length >= 7) {
                const point: PickData = {
                  d1: values[0],
                  d2: values[1],
                  frequency: values[2],
                  d3: values[3],
                  slowness: values[4],
                  d4: values[5],
                  d5: values[6]
                };
                newPoints.push(point);
              }
            }
            
            if (newPoints.length === 0) {
              dispatch(addToast({
                message: "No valid points found in file",
                type: "warning",
                duration: 5000
              }));
              return;
            }
            
            setPickData(newPoints)
            dispatch(addToast({
              message: `Successfully loaded ${newPoints.length} points`,
              type: "success",
              duration: 5000
            }));
          };
          
          reader.readAsText(file);
        };
        
        input.click();
      } catch (fallbackErr) {
        console.error("Fallback upload method failed:", fallbackErr);
      }
    }
  }, [dispatch]);
  

  const handleUnitChange = (type: "velocity" | "period", newUnit: string) => {
    const currentUnit = type === "velocity" ? velocityUnit : periodUnit;

    if (newUnit !== currentUnit) {
      if (type === "velocity") {
        setVelocityUnit(newUnit as "velocity" | "slowness");
      } else {
        setPeriodUnit(newUnit as "period" | "frequency");
      }
    }
  };

  const handleAxisLimitChange = (
    axis: "xmin" | "xmax" | "ymin" | "ymax",
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // Different validation rules based on unit type and axis
    if (axis.startsWith("x")) {
      // Period/Frequency limits
      const minLimit = periodUnit === "period" ? ABS_MIN_PERIOD : ABS_MIN_FREQUENCY;

      let newLimits = { ...curveAxisLimits };

      if (axis === "xmin") {
        newLimits.xmin = Math.max(minLimit, numValue);
        if (newLimits.xmin >= newLimits.xmax) {
          newLimits.xmax =
            newLimits.xmin + (periodUnit === "period" ? ABS_MIN_PERIOD : ABS_MIN_FREQUENCY);
        }
      } else {
        const minDelta = periodUnit === "period" ? ABS_MIN_PERIOD : ABS_MIN_FREQUENCY;
        newLimits.xmax = Math.max(newLimits.xmin + minDelta, numValue);
      }

      console.log("newCurveLimits:", newLimits);
      setCurveAxisLimits(newLimits);
    } else {
      // Velocity/Slowness limits
      const minLimit = velocityUnit === "velocity" ? ABS_MIN_VELOCITY : ABS_MIN_SLOWNESS;
      const valueInMeters =
        displayUnits === "ft" ? ToMeter(numValue) : numValue;

      let newLimits = { ...curveAxisLimits };

      if (axis === "ymin") {
        newLimits.ymin = Math.max(minLimit, valueInMeters);
        if (newLimits.ymin >= newLimits.ymax) {
          newLimits.ymax =
            newLimits.ymin + (velocityUnit === "velocity" ? ABS_MIN_VELOCITY : ABS_MIN_SLOWNESS);
        }
      } else {
        const minDelta = velocityUnit === "velocity" ? ABS_MIN_VELOCITY : ABS_MIN_SLOWNESS;
        newLimits.ymax = Math.max(newLimits.ymin + minDelta, valueInMeters);
      }

      console.log("newCurveLimits:", newLimits);
      setCurveAxisLimits(newLimits);
    }
  };

  const displayRMSE = () => {
    if (rmseVel !== null) {
      return displayUnits === "ft"
        ? `${(rmseVel * 3.28084).toFixed(2)} ft/s`
        : `${rmseVel.toFixed(2)} m/s`;
    }
    return "N/A";
  };

  const handleSwapAxes = () => {
    setAxesSwapped(!axesSwapped);
    // setCurveAxisLimits(prev => ({
    //   xmin: prev.ymin,
    //   xmax: prev.ymax,
    //   ymin: prev.xmin,
    //   ymax: prev.xmax
    // }));
  };

  const handleReverseAxis = (type: "velocity" | "period") => {
    if (type === "velocity") {
      setVelocityReversed(!velocityReversed);
      // setCurveAxisLimits(prev => ({
      //   ...prev,
      //   ymin: prev.ymax,
      //   ymax: prev.ymin
      // }));
    } else {
      setPeriodReversed(!periodReversed);
      // setCurveAxisLimits(prev => ({
      //   ...prev,
      //   xmin: prev.xmax,
      //   xmax: prev.xmin
      // }));
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!plotRef.current) return;
    event.stopPropagation();
    const rect = plotRef.current.getBoundingClientRect();
    const screenX = periodReversed ? rect.width - (event.clientX - rect.left) : event.clientX - rect.left;
    const screenY = velocityReversed ? event.clientY - rect.top : rect.height - (event.clientY - rect.top);

    const nearestPoint = pickPoints
      .map((point) => {
        const dist = Math.sqrt(
          (coordinateHelpers.toScreenX(point.x) - screenX) ** 2 +
          (coordinateHelpers.toScreenY(point.y) - screenY) ** 2
        );
        return { ...point, dist };
      })
      .filter((point) => point.dist < 5)
      .sort((a, b) => a.dist - b.dist)[0];
    // nearestPoint && console.log("Nearest Point:", nearestPoint);
    setHoveredPoint(nearestPoint);
  };

  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      setPlotDimensions(dimensions);
    },
    []
  );

  useEffect(() => {
    if (!pickData.length) return;

    const newPickPoints = convertToPlotPoints(
      pickData,
      periodUnit,
      velocityUnit
    );

    setPickPoints(newPickPoints);
  }, [pickData, periodUnit, velocityUnit, axesSwapped]);

  useEffect(() => {
    const xmin = Math.max(
      0.0000000001,
      periodUnit === "frequency"
        ? dataLimits.minFrequency
        : 1 / dataLimits.maxFrequency
    );
    const xmax = Math.max(
      0.0000000001,
      periodUnit === "frequency"
        ? dataLimits.maxFrequency
        : 1 / dataLimits.minFrequency
    );
    const ymin = Math.max(
      0.0000000001,
      velocityUnit === "slowness"
        ? dataLimits.minSlowness
        : 1 / dataLimits.maxSlowness
    );
    const ymax = Math.max(
      0.0000000001,
      velocityUnit === "slowness"
        ? dataLimits.maxSlowness
        : 1 / dataLimits.minSlowness
    );

    setCurveAxisLimits(
      axesSwapped
        ? {
          xmin: ymin,
          xmax: ymax,
          ymin: xmin * VELOCITY_MIN_MARGIN_FACTOR,
          ymax: xmax * VELOCITY_MAX_MARGIN_FACTOR,
        }
        : {
          xmin: xmin,
          xmax: xmax,
          ymin: ymin * VELOCITY_MIN_MARGIN_FACTOR,
          ymax: ymax * VELOCITY_MAX_MARGIN_FACTOR,
        }
    );
  }, [dataLimits, axesSwapped, periodUnit, velocityUnit]);

  useEffect(() => {
    console.log("curveAxisLimits:", curveAxisLimits, dataLimits);
  }, [curveAxisLimits]);

  useEffect(() => {
    hoveredPoint
      ? setTooltipContent(
        (() => {
          // Handle x-axis (period/frequency) conversion
          let xValue = hoveredPoint.x;

          // Handle y-axis (velocity/slowness) conversion
          let yValue = hoveredPoint.y;

          // Convert to display units if needed
          if (displayUnits === "ft") {
            if (velocityUnit === "velocity") {
              yValue = ToFeet(yValue);
            } else {
              // slowness
              yValue = yValue / 3.28084; // Convert s/m to s/ft
            }
          }

          // Format the display string
          return `(${xValue.toFixed(4)} ${periodUnit === "period" ? "s" : "Hz"
            }, ${yValue.toFixed(4)} ${velocityUnit === "velocity"
              ? `${displayUnits}/s`
              : `s/${displayUnits}`
            })`;
        })()
      )
      : setTooltipContent("");
  }, [
    hoveredPoint,
    displayUnits,
    periodReversed,
    velocityReversed,
    periodUnit,
    velocityUnit,
  ]);

  useEffect(() => {
    // console.log("Pick Points After Changed:", curveAxisLimits, pickPoints);
  }, [pickPoints]);

  useEffect(() => {
    // Generate points that exactly match the axis limits
    // Get min and max frequency based on curveAxisLimits
    const minForP = axesSwapped ? curveAxisLimits.ymin : curveAxisLimits.xmin;
    const maxForP = axesSwapped ? curveAxisLimits.ymax : curveAxisLimits.xmax;
    const minFrequency = periodUnit == "frequency" ? minForP : 1 / maxForP;
    const maxFrequency = periodUnit == "frequency" ? maxForP : 1 / minForP;
    const xValues = generateEvenlySpacedPoints(
      1 / minFrequency,
      1 / maxFrequency,
      Math.max(2, numPoints)
    );
    // Convert periods based on current unit before calculation
    const calcPeriods = (
      periodUnit === "frequency"
        ? xValues.map((p) => convertUnit(p, "frequency", "period"))
        : xValues
    ).sort((a, b) => a - b);

    let newPeriods;
    let pointIdxs: number[] | null = null;

    if (pickData.length > 0) {
      const newPointPeriods = pickData.map((data: PickData) =>
        convertUnit(data.frequency, "frequency", "period")
      );
      pointIdxs = Array(newPointPeriods.length);

      // Merge sorted arrays, tracking indices that match points so we can calculate RMSE later
      newPeriods = Array(newPointPeriods.length + calcPeriods.length);
      let i = 0,
        j = 0,
        k = 0,
        l = 0;
      while (i < newPointPeriods.length && j < calcPeriods.length) {
        if (newPointPeriods[i] < calcPeriods[j]) {
          newPeriods[k] = newPointPeriods[i];
          pointIdxs[l] = k;
          i++;
          k++;
          l++;
        } else {
          newPeriods[k] = calcPeriods[j];
          j++;
          k++;
        }
      }
      while (i < newPointPeriods.length) {
        newPeriods[k] = newPointPeriods[i];
        pointIdxs[l] = k;
        i++;
        k++;
        l++;
      }
      while (j < calcPeriods.length) {
        newPeriods[k] = calcPeriods[j];
        j++;
        k++;
      }
      const oldNewPeriods = [...newPointPeriods, ...calcPeriods];
      oldNewPeriods.sort((a, b) => a - b);
    } else {
      newPeriods = calcPeriods;
    }

    // console.log("Periods:", newPeriods)
    if (layers.length) {
      const num_layers = layers.length;

      const layer_thicknesses = layers.map(
        (layer) => layer.endDepth - layer.startDepth
      );

      const vels_shear = layers.map((layer) => layer.velocity);
      const densities = layers.map((layer) => layer.density);
      const vels_compression = vels_shear.map((v) => v * Math.sqrt(3));

      const model = new VelModel(
        num_layers,
        layer_thicknesses,
        densities,
        vels_compression,
        vels_shear,
        1 / dataLimits.maxSlowness,
        1 / dataLimits.minSlowness,
        2.0
      );

      const calculatedVs30 = model.get_vs30();
      const formattedAsceVersion = asceVersion
        .toLowerCase()
        .replace(/[- ]/g, "_");
      const calculatedSiteClass = VelModel.calc_site_class(
        formattedAsceVersion,
        calculatedVs30
      );

      setVs30(calculatedVs30);
      setSiteClass(calculatedSiteClass);

      // Get min and max slowness from curveAxisLimits
      const minVorS = axesSwapped ? curveAxisLimits.xmin : curveAxisLimits.ymin;
      const maxVorS = axesSwapped ? curveAxisLimits.xmax : curveAxisLimits.ymax;
      const minSlowness = velocityUnit === "slowness" ? minVorS : 1 / maxVorS;
      const maxSlowness = velocityUnit === "slowness" ? maxVorS : 1 / minVorS;
      const newVelocities = CalcCurve(
        newPeriods,
        num_layers,
        layer_thicknesses,
        vels_shear,
        1 / maxSlowness * 0.9,
        1 / minSlowness * 1.1,
        2.0,
        densities
      );
      console.log(1 / dataLimits.maxSlowness,
        1 / dataLimits.minSlowness,)
      if (pointIdxs != null) {
        const curveVels = pointIdxs.map((i) => newVelocities[i]);
        const pointVels: number[] = pickData.map((p) =>
          convertUnit(p.slowness, "slowness", "velocity")
        );

        // Calculate RMSE for velocity
        const diffSquaredVelArr = pointVels
          .map((pointVel, index) => {
            const curveVel = curveVels[index];
            if (curveVel != null) {
              return (curveVel - pointVel) ** 2;
            } else {
              return null;
            }
          })
          .filter((a) => a != null);

        if (diffSquaredVelArr.length > 0) {
          setRmseVel(
            Math.sqrt(
              diffSquaredVelArr.reduce(
                (accumulator, currentValue) => accumulator + currentValue,
                0
              ) / diffSquaredVelArr.length
            )
          );
        } else {
          setRmseVel(null);
        }
      }

      // console.log("newVelocities:", newVelocities);
      const newCurvePoints: Point[] = newPeriods
        .map((period, index) => {
          if (period === null || newVelocities[index] === null) return null;
          return axesSwapped
            ? {
              y:
                periodUnit === "frequency"
                  ? convertUnit(period, "period", "frequency")
                  : period,
              x:
                velocityUnit === "slowness"
                  ? convertUnit(newVelocities[index], "velocity", "slowness")
                  : newVelocities[index],
            }
            : {
              x:
                periodUnit === "frequency"
                  ? convertUnit(period, "period", "frequency")
                  : period,
              y:
                velocityUnit === "slowness"
                  ? convertUnit(newVelocities[index], "velocity", "slowness")
                  : newVelocities[index],
            };
        })
        .filter(
          (point): point is Point =>
            point !== null &&
            !isNaN(point.x) &&
            !isNaN(point.y) &&
            point.x > 0 &&
            point.y > 0
        )
        .sort((a, b) => a.x - b.x);

      setCurvePoints(newCurvePoints);
    }
  }, [
    layers,
    curveAxisLimits,
    numPoints,
    asceVersion,
    periodUnit,
    velocityUnit,
    axesSwapped,
  ]);

  useEffect(() => {
    console.log("Plot Dimesions:", plotDimensions)
  }, [plotDimensions]);

  return (
    <div className="card shadow-sm">
      <SectionHeader title="Dispersion Curve" />
      <div className="card-body">
        <div className="row g-4">
          <div className="col-md-6 d-flex">
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={handleUploadPoints}
            >
              Upload Points
            </button>
          </div>
          <div className="col-md-6">
            <div className="d-flex">
              <label className="form-label w-50">Number of Points:</label>
              <input
                type="number"
                value={numPoints}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0 && value <= 100) {
                    setNumPoints(value);
                  }
                }}
                className="form-control form-control-sm w-50"
                min="1"
                max="100"
                step="1"
              />
            </div>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-md-5">
            <div className="mb-2">
              <div className="d-flex align-items-center mb-2">
                {axesSwapped ?
                  (<select
                    value={periodUnit}
                    onChange={(e) => handleUnitChange("period", e.target.value)}
                    className="form-select form-select-sm me-2"
                  >
                    <option value="period">Period (s)</option>
                    <option value="frequency">Frequency (Hz)</option>
                  </select>) :
                  (<select
                    value={velocityUnit}
                    onChange={(e) => handleUnitChange("velocity", e.target.value)}
                    className="form-select form-select-sm me-2"
                  >
                    <option value="velocity">Velocity ({displayUnits}/s)</option>
                    <option value="slowness">Slowness (s/{displayUnits})</option>
                  </select>)
                }
                <button
                  onClick={() => handleReverseAxis("velocity")}
                  className={`btn btn-sm ${velocityReversed ? "btn-primary" : "btn-outline-secondary"}`}
                  title={`Reverse ${axesSwapped ? "Horizontal" : "Vertical"} Axis`}
                >
                  {axesSwapped ? "←→" : "↑↓"}
                </button>
              </div>

              <div className="mb-2 d-flex">
                <label className="form-label w-50">
                  Max {axesSwapped ? periodUnit === "period" ? "Period" : "Frequency" : velocityUnit === "velocity" ? "Velocity" : "Slowness"}:
                </label>
                <input
                  type="number"
                  value={displayUnits === "ft" ? ToFeet(curveAxisLimits.ymax) : curveAxisLimits.ymax}
                  onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                  className="form-control form-control-sm w-50"
                  step={velocityUnit === "velocity" ? "1" : "0.0001"}
                />
              </div>
              <div className="mb-2 d-flex">
                <label className="form-label w-50">
                  Min {axesSwapped ? periodUnit === "period" ? "Period" : "Frequency" : velocityUnit === "velocity" ? "Velocity" : "Slowness"}:
                </label>
                <input
                  type="number"
                  value={displayUnits === "ft" ? ToFeet(curveAxisLimits.ymin) : curveAxisLimits.ymin}
                  onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                  className="form-control form-control-sm w-50"
                  step={velocityUnit === "velocity" ? "1" : "0.0001"}
                />
              </div>
            </div>
          </div>
          <div className="col-md-2 d-flex justify-content-center align-items-center p-1">
            <div>
              <button
                onClick={handleSwapAxes}
                className={`btn flex-grow-1 ${axesSwapped ? "btn-primary" : "btn-outline-secondary"}`}
                title="Swap Axes"
              >
                Swap Axes
              </button>
            </div>
          </div>
          <div className="col-md-5">
            <div className="mb-3">
              <div className="d-flex align-items-center mb-2">
                {!axesSwapped ?
                  (<select
                    value={periodUnit}
                    onChange={(e) => handleUnitChange("period", e.target.value)}
                    className="form-select form-select-sm me-2"
                  >
                    <option value="period">Period (s)</option>
                    <option value="frequency">Frequency (Hz)</option>
                  </select>) :
                  (<select
                    value={velocityUnit}
                    onChange={(e) => handleUnitChange("velocity", e.target.value)}
                    className="form-select form-select-sm me-2"
                  >
                    <option value="velocity">Velocity ({displayUnits}/s)</option>
                    <option value="slowness">Slowness (s/{displayUnits})</option>
                  </select>)
                }
                <button
                  onClick={() => handleReverseAxis("period")}
                  className={`btn btn-sm ${periodReversed ? "btn-primary" : "btn-outline-secondary"}`}
                  title={`Reverse ${axesSwapped ? "Vertical" : "Horizontal"} Axis`}
                >
                  {axesSwapped ? "↑↓" : "←→"}
                </button>
              </div>
              <div className="mb-2 d-flex">
                <label className="form-label w-50">
                  Max {axesSwapped ? velocityUnit === "velocity" ? "Velocity" : "Slowness" : periodUnit === "period" ? "Period" : "Frequency"}:
                </label>
                <input
                  type="number"
                  value={curveAxisLimits.xmax}
                  onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                  className="form-control form-control-sm w-50"
                  step={periodUnit === "period" ? "0.001" : "0.1"}
                />
              </div>
              <div className="mb-2 d-flex">
                <label className="form-label w-50">
                  Min {axesSwapped ? velocityUnit === "velocity" ? "Velocity" : "Slowness" : periodUnit === "period" ? "Period" : "Frequency"}:
                </label>
                <input
                  type="number"
                  value={curveAxisLimits.xmin}
                  onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
                  className="form-control form-control-sm w-50"
                  step={periodUnit === "period" ? "0.001" : "0.1"}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-4">
            <span className="fw-semibold">Vs30:</span>{" "}
            <span className="fw-bold">
              {vs30
                ? displayUnits === "ft"
                  ? `${ToFeet(vs30).toFixed(3)} ft/s`
                  : `${vs30.toFixed(3)} m/s`
                : "N/A"}
            </span>
          </div>
          <div className="col-md-4">
            <span className="fw-semibold">RMSE:</span>{" "}
            <span className="fw-bold">{displayRMSE()}</span>
          </div>
          <div className="col-md-4">
            <span className="fw-semibold">Site Class:</span>{" "}
            <span className="fw-bold">{siteClass || "N/A"}</span>
          </div>
        </div>
        <div className="position-relative m-5">
          <BasePlot
            ref={plotRef}
            yLabel={
              velocityUnit === "velocity"
                ? `Velocity (${displayUnits}/s)`
                : `Slowness (s/${displayUnits})`
            }
            xLabel={periodUnit === "period" ? "Period (s)" : "Frequency (Hz)"}
            xMin={axesSwapped ? curveAxisLimits.ymin : curveAxisLimits.xmin}
            xMax={axesSwapped ? curveAxisLimits.ymax : curveAxisLimits.xmax}
            yMin={axesSwapped ? curveAxisLimits.xmin : curveAxisLimits.ymin}
            yMax={axesSwapped ? curveAxisLimits.xmax : curveAxisLimits.ymax}
            display={(value) =>
              displayUnits === "ft"
                ? ToFeet(value).toFixed(3)
                : value.toFixed(3)
            }
            tooltipContent={tooltipContent}
            onPointerMove={handlePointerMove}
            onDimensionChange={handleDimensionChange}
            axesSwapped={axesSwapped}
            xAxisReversed={periodReversed}
            yAxisReversed={velocityReversed}
          >
            <pixiContainer>
              <pixiGraphics
                draw={(g) => {
                  // console.log("Pick Points:", pickPoints)
                  g.clear();
                  // Draw the main plot area boundary
                  // g.setStrokeStyle({ width: 1, color: 0xCCCCCC });
                  // g.setFillStyle({color:0xEEEEEE, alpha:0.5});
                  // g.rect(10, 10, plotDimensions.width, plotDimensions.height);
                  // g.fill();

                  // Draw grid lines
                  g.setStrokeStyle({ width: 1, color: 0xeeeeee, alpha: 0.8 });

                  // Vertical grid lines (velocity)
                  const velocityStep = (curveAxisLimits.xmax - curveAxisLimits.xmin) / 10;
                  for (
                    let v = curveAxisLimits.xmin;
                    v <= curveAxisLimits.xmax;
                    v += velocityStep
                  ) {
                    const x = coordinateHelpers.toScreenX(v);
                    g.moveTo(x, 0);
                    g.lineTo(x, plotDimensions.height);
                  }

                  // Horizontal grid lines (depth)
                  const depthStep = (curveAxisLimits.ymax - curveAxisLimits.ymin) / 10;
                  for (
                    let d = curveAxisLimits.ymin;
                    d <= curveAxisLimits.ymax;
                    d += depthStep
                  ) {
                    const y = coordinateHelpers.toScreenY(d);
                    g.moveTo(0, y);
                    g.lineTo(plotDimensions.width, y);
                  }
                  g.stroke();
                }}
              />
              <pixiGraphics
                draw={(g: Graphics) => {
                  // console.log("Pick Points in Drawing:", pickPoints);
                  g.clear();
                  pickPoints.map((point) => {
                    let x = coordinateHelpers.toScreenX(point.x);
                    let y = coordinateHelpers.toScreenY(point.y);

                    if (periodReversed) {
                      x = plotDimensions.width - x;
                    }

                    if (!velocityReversed) {
                      y = plotDimensions.height - y;
                    }

                    if (point === hoveredPoint) {
                      g.fill({ color: 0xff0000 });
                      g.circle(x, y, 5);
                    } else {
                      g.fill({ color: 0xff0000 });
                      g.circle(x, y, 3);
                    }
                    g.fill();
                  });
                }}
              />
            </pixiContainer>
            <pixiGraphics
              draw={(g: Graphics) => {
                // console.log("Curve Points in Drawing:", curvePoints);
                g.clear();
                g.setStrokeStyle({
                  width: 2,
                  color: 0x000000,
                  alpha: 1,
                });
                g.beginPath();

                // Draw curve points
                curvePoints.forEach((point, index) => {
                  let x = coordinateHelpers.toScreenX(point.x);
                  let y = coordinateHelpers.toScreenY(point.y);

                  // Handle axis reversals
                  if (periodReversed) {
                    x = plotDimensions.width - x;
                  }

                  if (!velocityReversed) {
                    y = plotDimensions.height - y;
                  }

                  if (index === 0) {
                    g.moveTo(x, y);
                  } else {
                    g.lineTo(x, y);
                  }
                });
                g.stroke();
              }}
            />
          </BasePlot>
        </div>
      </div>
    </div>
  );
};
