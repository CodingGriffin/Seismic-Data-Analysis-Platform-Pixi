import { extend } from "@pixi/react";
import { Graphics, Container } from "pixi.js";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Point } from "../../types";
import { PickData } from "../../types";
import { CalcCurve } from "../../utils";
import VelModel from "../../utils/VelModel";
import { useDisper } from "../../context/DisperContext";
import { BasePlot } from "../controls/BasePlot";
import { FileControls } from "../controls/FileControls";

extend({ Graphics, Container });

const VELOCITY_MAX_MARGIN_FACTOR = 1.1; // 110% of max velocity
const VELOCITY_MIN_MARGIN_FACTOR = 0.9; // 90% of min velocity
const ABS_MIN_VELOCITY = 0.0000000001;
const ABS_MIN_PERIOD = 0.0000000001;
const ABS_MIN_SLOWNESS = 0.0000000001;
const ABS_MIN_FREQUENCY= 0.0000000001;

export const LeftPlot = () => {
  const {
    state: { layers, displayUnits, pickData, asceVersion, dataLimits },
    ToMeter,
    ToFeet,
    setPickData,
  } = useDisper();

  const [curvePoints, setCurvePoints] = useState<Point[]>([]);
  const [pickPoints, setPickPoints] = useState<Point[]>([]);
  const [tooltipContent, setTooltipContent] = useState<string>("");

  const [hoveredPoint, setHoveredPoint] = useState<Point | undefined>(
    undefined
  );
  const [numPoints, setNumPoints] = useState<number>(10);
  const [rmseVel, setRmseVel] = useState<number | null>(null);
  const [axisLimits, setAxisLimits] = useState({
    xmin: 0.001, // Period min
    xmax: 0.6, // Period max
    ymin: 30, // Velocity min
    ymax: 500, // Velocity max
  });

  const [plotDimensions, setPlotDimensions] = useState({
    width: 640,
    height: 480,
  });

  const plotRef = useRef<HTMLDivElement>(null);
  const [vs30, setVs30] = useState<number | null>(null);
  const [siteClass, setSiteClass] = useState<string | null>(null);
  const [velocityUnit, setVelocityUnit] = useState<"velocity" | "slowness">(
    "velocity"
  );
  const [periodUnit, setPeriodUnit] = useState<"period" | "frequency">(
    "period"
  );
  const [velocityReversed, setVelocityReversed] = useState(false);
  const [periodReversed, setPeriodReversed] = useState(false);
  const [axesSwapped, setAxesSwapped] = useState(false);

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

        return Math.round(value * 10000) / 10000;
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

        return Math.round(value * 10000) / 10000;
      },
    }),
    [axisLimits, plotDimensions]
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

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rawData: PickData[] = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [d1, d2, frequency, d3, slowness, d4, d5] = line
          .split(/\s+/)
          .map((num) => parseFloat(num.trim()));

        return {
          d1,
          d2,
          frequency,
          d3,
          slowness,
          d4,
          d5,
        };
      });
    setPickData(rawData);
  };

  const handleUnitChange = (type: "velocity" | "period", newUnit: string) => {
    const updateFn = type === "velocity" ? setVelocityUnit : setPeriodUnit;
    const currentUnit = type === "velocity" ? velocityUnit : periodUnit;

    if (newUnit !== currentUnit) {
      updateFn(newUnit as any);
      // setAxisLimits((prev) => ({
      //   ...prev,
      //   [type === "velocity" ? "ymin" : "xmin"]: convertUnit(
      //     prev[type === "velocity" ? "ymax" : "xmax"],
      //     currentUnit,
      //     newUnit
      //   ),
      //   [type === "velocity" ? "ymax" : "xmax"]: convertUnit(
      //     prev[type === "velocity" ? "ymin" : "xmin"],
      //     currentUnit,
      //     newUnit
      //   ),
      // }));
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

      setAxisLimits((prev) => {
        let newLimits = { ...prev };

        if (axis === "xmin") {
          // Ensure min is at least minLimit
          newLimits.xmin = Math.max(minLimit, numValue);
          // If min becomes greater than or equal to max, adjust max
          if (newLimits.xmin >= newLimits.xmax) {
            newLimits.xmax =
              newLimits.xmin + (periodUnit === "period" ? ABS_MIN_PERIOD : ABS_MIN_FREQUENCY);
          }
        } else {
          // xmax
          // Ensure max is greater than min by at least the minimum delta
          const minDelta = periodUnit === "period" ? ABS_MIN_PERIOD : ABS_MIN_FREQUENCY;
          newLimits.xmax = Math.max(newLimits.xmin + minDelta, numValue);
        }

        return newLimits;
      });
    } else {
      // Velocity/Slowness limits
      const minLimit = velocityUnit === "velocity" ? ABS_MIN_VELOCITY : ABS_MIN_SLOWNESS;
      const valueInMeters =
        displayUnits === "ft" ? ToMeter(numValue) : numValue;

      setAxisLimits((prev) => {
        let newLimits = { ...prev };

        if (axis === "ymin") {
          // Ensure min is at least minLimit
          newLimits.ymin = Math.max(minLimit, valueInMeters);
          // If min becomes greater than or equal to max, adjust max
          if (newLimits.ymin >= newLimits.ymax) {
            newLimits.ymax =
              newLimits.ymin + (velocityUnit === "velocity" ? ABS_MIN_VELOCITY : ABS_MIN_SLOWNESS);
          }
        } else {
          // ymax
          // Ensure max is greater than min by at least the minimum delta
          const minDelta = velocityUnit === "velocity" ? ABS_MIN_VELOCITY : ABS_MIN_SLOWNESS;
          newLimits.ymax = Math.max(newLimits.ymin + minDelta, valueInMeters);
        }

        return newLimits;
      });
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
    setAxesSwapped((prev) => !prev);
    // setAxisLimits(prev => ({
    //   xmin: prev.ymin,
    //   xmax: prev.ymax,
    //   ymin: prev.xmin,
    //   ymax: prev.xmax
    // }));
  };

  const handleReverseAxis = (type: "velocity" | "period") => {
    if (type === "velocity") {
      setVelocityReversed((prev) => !prev);
      // setAxisLimits(prev => ({
      //   ...prev,
      //   ymin: prev.ymax,
      //   ymax: prev.ymin
      // }));
    } else {
      setPeriodReversed((prev) => !prev);
      // setAxisLimits(prev => ({
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
    const screenX = periodReversed? rect.width - (event.clientX - rect.left) : event.clientX - rect.left;
    const screenY = velocityReversed? event.clientY - rect.top : rect.height - (event.clientY - rect.top);

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

    setAxisLimits(() =>
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
    console.log("axisLimits:", axisLimits, dataLimits);
  }, [axisLimits]);

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
            return `(${xValue.toFixed(4)} ${
              periodUnit === "period" ? "s" : "Hz"
            }, ${yValue.toFixed(4)} ${
              velocityUnit === "velocity"
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
    // console.log("Pick Points After Changed:", axisLimits, pickPoints);
  }, [pickPoints]);

  useEffect(() => {
    // Generate points that exactly match the axis limits
    const xValues = generateEvenlySpacedPoints(
          1/dataLimits.minFrequency,
          1/dataLimits.minFrequency,
          numPoints + 1
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
        1/dataLimits.maxSlowness,
        1/dataLimits.minSlowness,
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

      const newVelocities = CalcCurve(
        newPeriods,
        num_layers,
        layer_thicknesses,
        vels_shear,
        1/dataLimits.maxSlowness*0.9,
        1/dataLimits.minSlowness*1.1,
        2.0,
        densities
      );
      console.log( 1/dataLimits.maxSlowness,
        1/dataLimits.minSlowness,)
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
    axisLimits,
    numPoints,
    asceVersion,
    periodUnit,
    velocityUnit,
    axesSwapped,
  ]);

  return (
    <div className="flex flex-col items-center border-2 border-gray-300 rounded-lg p-4 shadow-sm">
      <div className="w-full">
        <div className="flex gap-4 flex-wrap justify-center mb-4">
          <div className="flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={velocityUnit}
                onChange={(e) => handleUnitChange("velocity", e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="velocity">Velocity ({displayUnits}/s)</option>
                <option value="slowness">Slowness (s/{displayUnits})</option>
              </select>
              <button
                onClick={() => handleReverseAxis("velocity")}
                className={`px-2 py-1 text-sm border rounded transition-colors duration-200
                  ${
                    velocityReversed
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                title={`Reverse ${
                  axesSwapped ? "Horizontal" : "Vertical"
                } Axis`}
              >
                {axesSwapped ? "←→" : "↑↓"}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max {axesSwapped?periodUnit==="period"?"Period":"Frequency":velocityUnit === "velocity" ? "Velocity" : "Slowness"}:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(axisLimits.ymax)
                    : axisLimits.ymax
                }
                onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={velocityUnit === "velocity" ? "1" : "0.0001"}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min {axesSwapped?periodUnit==="period"?"Period":"Frequency":velocityUnit === "velocity" ? "Velocity" : "Slowness"}:
              </label>
              <input
                type="number"
                value={
                  displayUnits === "ft"
                    ? ToFeet(axisLimits.ymin)
                    : axisLimits.ymin
                }
                onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={velocityUnit === "velocity" ? "1" : "0.0001"}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={periodUnit}
                onChange={(e) => handleUnitChange("period", e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="period">Period (s)</option>
                <option value="frequency">Frequency (Hz)</option>
              </select>
              <button
                onClick={() => handleReverseAxis("period")}
                className={`px-2 py-1 text-sm border rounded transition-colors duration-200
                  ${
                    periodReversed
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                title={`Reverse ${
                  axesSwapped ? "Vertical" : "Horizontal"
                } Axis`}
              >
                {axesSwapped ? "↑↓" : "←→"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max {axesSwapped? velocityUnit === "velocity" ? "Velocity" : "Slowness":periodUnit === "period" ? "Period" : "Frequency"}:
              </label>
              <input
                type="number"
                value={axisLimits.xmax}
                onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={periodUnit === "period" ? "0.001" : "0.1"}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min {axesSwapped? velocityUnit === "velocity" ? "Velocity" : "Slowness":periodUnit === "period" ? "Period" : "Frequency"}:
              </label>
              <input
                type="number"
                value={axisLimits.xmin}
                onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={periodUnit === "period" ? "0.001" : "0.1"}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={handleSwapAxes}
            className={`px-3 py-1 text-sm border rounded transition-colors duration-200
              ${
                axesSwapped
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            title="Swap Axes"
          >
            Swap Axes
          </button>
        </div>
        <div className="flex justify-center gap-4 mb-4">
          <FileControls
            onFileSelect={handleFileSelect}
            showDownload={false}
            accept=".pck"
          />
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Number of Points:
              </label>
              <input
                type="number"
                value={numPoints}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0 && value <= 100) {
                    setNumPoints(value);
                  }
                }}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                min="1"
                max="100"
                step="1"
              />
            </div>
          </div>
        </div>
        <div className="relative border border-gray-200 rounded-lg bg-white shadow-sm w-full aspect-[4/3] min-h-[300px]">
          <BasePlot
            yLabel={
              velocityUnit === "velocity"
                ? `Velocity (${displayUnits}/s)`
                : `Slowness (s/${displayUnits})`
            }
            xLabel={periodUnit === "period" ? "Period (s)" : "Frequency (Hz)"}
            xMin={axesSwapped? axisLimits.ymin: axisLimits.xmin}
            xMax={axesSwapped? axisLimits.ymax: axisLimits.xmax}
            yMin={axesSwapped? axisLimits.xmin: axisLimits.ymin}
            yMax={axesSwapped? axisLimits.xmax: axisLimits.ymax}
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
            ref={plotRef}
          >
            <pixiContainer>
              <pixiGraphics
                draw={(g) => {
                  // console.log("Pick Points:", pickPoints)
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
      <div className="mt-4 p-4 border-t border-gray-200">
        <div className="flex justify-center space-x-8">
          <div className="text-center">
            <span className="font-semibold">Vs30:</span>{" "}
            <span className="font-bold">
              {vs30
                ? displayUnits === "ft"
                  ? `${ToFeet(vs30)} ft/s`
                  : `${vs30} m/s`
                : "N/A"}
            </span>
          </div>
          <div className="text-center">
            <span className="font-semibold">RMSE:</span>
            <span className="font-bold">{displayRMSE()}</span>
          </div>
          <div className="text-center">
            <span className="font-semibold">Site Class:</span>{" "}
            <span className="font-bold">{siteClass || "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
