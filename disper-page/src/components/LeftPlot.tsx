import { Application, extend } from "@pixi/react";
import { Graphics, Container } from "pixi.js";
import { useState, useRef, useEffect } from "react";
import { Point } from "../types";
import { CalcCurve } from "../utils";
import VelModel from "../utils/VelModel";
import { useDisper } from '../context/DisperContext';
extend({ Graphics, Container });

const VELOCITY_MAX_MARGIN_FACTOR = 1.1; // 110% of max velocity
const VELOCITY_MIN_MARGIN_FACTOR = 0.9; // 90% of min velocity

interface PickData extends Point {
  d1: number;
  d2: number;
  frequency: number;
  d3: number;
  slowness: number;
  d4: number;
  d5: number;
}

export const LeftPlot = () => {
  const { 
    layers, 
    asceVersion,
  } = useDisper();
  
  const [vels, setVels] = useState<(number | null)[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [numPoints, setNumPoints] = useState<number>(20);
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
  const [periods, setPeriods] = useState<(number | null)[]>([]);
  const [vs30, setVs30] = useState<number | null>(null);
  const [siteClass, setSiteClass] = useState<string | null>(null);
  const [velocityUnit, setVelocityUnit] = useState<'velocity' | 'slowness'>('velocity');
  const [periodUnit, setPeriodUnit] = useState<'period' | 'frequency'>('period');

  const convertVelocityToSlowness = (velocity: number) => 1 / velocity;
  const convertSlownessToVelocity = (slowness: number) => 1 / slowness;
  const convertPeriodToFrequency = (period: number) => 1 / period;
  const convertFrequencyToPeriod = (frequency: number) => 1 / frequency;

  useEffect(() => {
    if (plotRef.current) {
      const { width, height } = plotRef.current.getBoundingClientRect();
      console.log(`Width: ${width}, Height: ${height}`);
      setPlotDimensions({ width, height });
    }
  }, []);
  useEffect(() => {
    // Generate periods array to always fill from xmin to xmax
    const periods = Array(numPoints + 1)  // +1 to include both start and end points
      .fill(null)
      .map((_, index) => {
        // Use linear interpolation to ensure we include both xmin and xmax
        return axisLimits.xmin + (index * (axisLimits.xmax - axisLimits.xmin)) / numPoints;
      });

    if (layers.length) {
      const num_layers: number = layers.length;
      const layer_thicknesses = layers.map(
        layer => layer.endDepth - layer.startDepth
      );
      const vels_shear = layers.map(layer => layer.velocity);
      const densities = layers.map(layer => layer.density);
      
      const vels_compression = vels_shear.map(v => v * Math.sqrt(3));

      const model = new VelModel(
        num_layers,
        layer_thicknesses,
        densities,
        vels_compression,
        vels_shear,
        Math.max(axisLimits.ymin - 50, 10),
        axisLimits.ymax + 10,
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

      const vels = CalcCurve(
        periods,
        num_layers,
        layer_thicknesses,
        vels_shear,
        Math.max(axisLimits.ymin - 50, 10),
        axisLimits.ymax + 10,
        2.0,
        densities
      );
      console.log("Periods", periods);
      console.log("Vels:", vels);
      setVels(vels);
      setPeriods(periods);
    }
  }, [
    layers,
    axisLimits.ymin,
    axisLimits.ymax,
    numPoints,
    asceVersion
  ]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const newPoints: PickData[] = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [d1, d2, frequency, d3, slowness, d4, d5] = line
          .split(/\s+/)
          .map((num) => parseFloat(num.trim()));

        // Calculate period from frequency (T = 1/f)
        const period = 1 / frequency;
        // Calculate velocity from slowness (v = 1/s)
        // Convert slowness from s/km to km/s
        const velocity = 1 / slowness;

        return {
          // Original data
          d1,
          d2,
          frequency,
          d3,
          slowness,
          d4,
          d5,
          // Calculated x,y for plotting
          x: period,
          y: velocity,
        };
      })
      .filter(
        (point) =>
          !isNaN(point.x) && !isNaN(point.y) && point.x > 0 && point.y > 0
      );

    console.log("Parsed data:", newPoints);
    if (newPoints.length > 0) {
      const xValues = newPoints.map((p) => p.x);
      const yValues = newPoints.map((p) => p.y);
      const minVelocity = Math.min(...yValues);
      const maxVelocity = Math.max(...yValues);

      setAxisLimits({
        xmin: Math.max(0.001, Math.round(Math.min(...xValues) * 1000) / 1000),
        xmax: Math.round(Math.max(...xValues) * 1000) / 1000,
        ymin: Math.max(0, Math.floor(minVelocity * VELOCITY_MIN_MARGIN_FACTOR)),
        ymax: Math.ceil(maxVelocity * VELOCITY_MAX_MARGIN_FACTOR),
      });

      setPoints(newPoints);
    }
  };

  const handleAxisLimitChange = (
    axis: "xmin" | "xmax" | "ymin" | "ymax",
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAxisLimits((prev) => {
        // Ensure xmin and ymin are never negative
        if ((axis === "xmin" || axis === "ymin") && numValue < 0) {
          return prev;
        }

        const newLimits = { ...prev, [axis]: numValue };
        if (
          newLimits.xmin >= newLimits.xmax ||
          newLimits.ymin >= newLimits.ymax
        ) {
          return prev;
        }
        return newLimits;
      });
    }
  };

  return (
    <div className="flex flex-col items-center border-2 border-gray-300 rounded-lg p-4 shadow-sm">
      <div className="w-full">
        <div className="flex gap-4 flex-wrap justify-center mb-4">
          <div className="flex flex-col">
            <div className="mb-2">
              <select
                value={velocityUnit}
                onChange={(e) => {
                  const newUnit = e.target.value as 'velocity' | 'slowness';
                  setVelocityUnit(newUnit);
                  
                  if (newUnit === 'slowness') {
                    setAxisLimits(prev => ({
                      ...prev,
                      ymin: convertVelocityToSlowness(prev.ymax),
                      ymax: convertVelocityToSlowness(prev.ymin)
                    }));
                  } else {
                    setAxisLimits(prev => ({
                      ...prev,
                      ymin: convertSlownessToVelocity(prev.ymax),
                      ymax: convertSlownessToVelocity(prev.ymin)
                    }));
                  }
                }}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="velocity">Velocity (m/s)</option>
                <option value="slowness">Slowness (s/m)</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max {velocityUnit === 'velocity' ? 'Velocity' : 'Slowness'}:
              </label>
              <input
                type="number"
                value={axisLimits.ymax}
                onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="1"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min {velocityUnit === 'velocity' ? 'Velocity' : 'Slowness'}:
              </label>
              <input
                type="number"
                value={axisLimits.ymin}
                onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="1"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mb-2">
              <select
                value={periodUnit}
                onChange={(e) => {
                  const newUnit = e.target.value as 'period' | 'frequency';
                  setPeriodUnit(newUnit);
                  
                  if (newUnit === 'frequency') {
                    setAxisLimits(prev => ({
                      ...prev,
                      xmin: convertPeriodToFrequency(prev.xmax),
                      xmax: convertPeriodToFrequency(prev.xmin)
                    }));
                  } else {
                    setAxisLimits(prev => ({
                      ...prev,
                      xmin: convertFrequencyToPeriod(prev.xmax),
                      xmax: convertFrequencyToPeriod(prev.xmin)
                    }));
                  }
                }}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="period">Period (s)</option>
                <option value="frequency">Frequency (Hz)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max {periodUnit === 'period' ? 'Period' : 'Frequency'}:
              </label>
              <input
                type="number"
                value={axisLimits.xmax}
                onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="0.05"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min {periodUnit === 'period' ? 'Period' : 'Frequency'}:
              </label>
              <input
                type="number"
                value={axisLimits.xmin}
                onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="0.05"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <input
            type="file"
            accept=".pck"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 mb-4
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
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
        <div
          className="relative border border-gray-200 rounded-lg bg-white shadow-sm w-full aspect-[4/3] min-h-[300px]"
          ref={plotRef}
        >
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-sm flex items-center gap-2">
            <span className="px-2 py-1 text-sm">
              {velocityUnit === 'velocity' ? 'Velocity (m/s)' : 'Slowness (s/m)'}
            </span>
          </div>

          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm flex items-center gap-2">
            <span className="px-2 py-1 text-sm">
              {periodUnit === 'period' ? 'Period (s)' : 'Frequency (Hz)'}
            </span>
          </div>

          <div className="absolute -left-8 top-0 h-full flex flex-col justify-between">
            <div className="text-xs">{axisLimits.ymax.toFixed(3)}</div>
            <div className="text-xs">{axisLimits.ymin.toFixed(3)}</div>
          </div>

          {plotRef.current && (
            <Application
              className="w-full h-full"
              width={plotDimensions.width}
              height={plotDimensions.height}
              background="white"
            >
              <pixiContainer>
                {points.map((point) => (
                  <pixiGraphics
                    // key={index}
                    draw={(g: Graphics) => {
                      g.clear();
                      // Convert values based on selected units
                      const xValue = periodUnit === 'frequency' 
                        ? convertPeriodToFrequency(point.x)
                        : point.x;
                      const yValue = velocityUnit === 'slowness'
                        ? convertVelocityToSlowness(point.y)
                        : point.y;

                      const screenX =
                        ((xValue - axisLimits.xmin) /
                          (axisLimits.xmax - axisLimits.xmin)) *
                        plotDimensions.width;
                      const screenY =
                        plotDimensions.height -
                        ((yValue - axisLimits.ymin) /
                          (axisLimits.ymax - axisLimits.ymin)) *
                          plotDimensions.height;

                      if (point === hoveredPoint) {
                        g.fill({ color: 0xff0000 });
                        g.circle(screenX, screenY, 7);
                        g.fill({ color: 0xff00ff, alpha: 0.8 });
                        g.circle(screenX, screenY, 3);
                        console.log("Hovered point:", screenX, screenY);
                      } else {
                        g.fill({ color: 0xff0000 });
                        g.circle(screenX, screenY, 5);
                      }
                      g.fill();
                    }}
                    eventMode="static"
                    onpointerover={() => setHoveredPoint(point)}
                    onpointerout={() => setHoveredPoint(null)}
                  />
                ))}
              </pixiContainer>
              <pixiContainer>
                <pixiGraphics
                  draw={(g: Graphics) => {
                    g.clear();
                    g.setStrokeStyle({
                      width: 2,
                      color: 0x000000,
                      alpha: 1,
                    });
                    g.beginPath();
                    periods.forEach((period, index) => {
                      if (vels[index] !== null && period !== null) {
                        // Convert values based on selected units
                        const xValue = periodUnit === 'frequency'
                          ? convertPeriodToFrequency(period)
                          : period;
                        const yValue = velocityUnit === 'slowness'
                          ? convertVelocityToSlowness(vels[index])
                          : vels[index];

                        const screenX =
                          ((xValue - axisLimits.xmin) /
                            (axisLimits.xmax - axisLimits.xmin)) *
                          plotDimensions.width;
                        const screenY =
                          plotDimensions.height -
                          ((yValue - axisLimits.ymin) /
                            (axisLimits.ymax - axisLimits.ymin)) *
                            plotDimensions.height;
                        if (index === 0) {
                          g.moveTo(screenX, screenY);
                        } else {
                          g.lineTo(screenX, screenY);
                        }
                      }
                    });
                    g.stroke();
                    g.closePath();
                  }}
                />
              </pixiContainer>
            </Application>
          )}

          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-white border border-black rounded px-1.5 py-0.5 text-xs shadow-sm pointer-events-none"
              style={{
                left:
                  ((periodUnit === 'frequency' 
                    ? convertPeriodToFrequency(hoveredPoint.x)
                    : hoveredPoint.x
                  - axisLimits.xmin) /
                    (axisLimits.xmax - axisLimits.xmin)) *
                    plotDimensions.width +
                  2,
                top:
                  plotDimensions.height -
                  ((velocityUnit === 'slowness'
                    ? convertVelocityToSlowness(hoveredPoint.y)
                    : hoveredPoint.y
                  - axisLimits.ymin) /
                    (axisLimits.ymax - axisLimits.ymin)) *
                    plotDimensions.height,
                zIndex: 1000,
              }}
            >
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 border border-black"
                  style={{
                    background: "rgb(255, 0, 0)",
                  }}
                />
                {`(${hoveredPoint.x.toFixed(3)} ${periodUnit === 'period' ? 's' : 'Hz'}, ${
                  hoveredPoint.y.toFixed(3)
                } ${velocityUnit === 'velocity' ? 'm/s' : 's/m'})`}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 p-4 border-t border-gray-200">
        <div className="flex justify-center space-x-8">
          <div className="text-center">
            <span className="font-semibold">Vs30:</span>{" "}
            <span>{vs30 ? `${vs30.toFixed(1)} m/s` : "N/A"}</span>
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
