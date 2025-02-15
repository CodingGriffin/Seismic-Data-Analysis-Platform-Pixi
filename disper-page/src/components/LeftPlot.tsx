import { Application, extend } from "@pixi/react";
import { Graphics, Container } from "pixi.js";
import { useState, useRef, useEffect } from "react";
import { Point } from "../types";
import { CalcCurve } from "../utils";
extend({ Graphics, Container });

export const LeftPlot = ({
  updatedLayers,
  phase_vel_min,
  phase_vel_max,
}: any) => {
  const [vels, setVels] = useState<(number | null)[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [axisLimits, setAxisLimits] = useState({
    xmin: 0.016, // Period min
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

  useEffect(() => {
    if (plotRef.current) {
      const { width, height } = plotRef.current.getBoundingClientRect();
      console.log(`Width: ${width}, Height: ${height}`);
      setPlotDimensions({ width, height });
    }
  }, []);
  useEffect(() => {
    console.log("updatedLayers", updatedLayers);
    // const periods = points.map((point) => point.x).sort((a, b) => a - b);
    const periods = Array(61)
      .fill(null)
      .map(
        (_, index) =>
          axisLimits.xmin + (index * (axisLimits.xmax - axisLimits.xmin)) / 20
      );
    //         period_vals Array of periods to calculate velocity for
    //  * @param num_layers Number of layers
    //  * @param layer_thicknesses Thicknesses of each layer. Calculate using end_depth - start_depth
    //  * @param vels_shear Shear Wave velocity
    //  * @param phase_vel_min Minimum velocity - use min value from window
    //  * @param phase_vel_max
    if (updatedLayers.length) {
      const num_layers: number = updatedLayers.length;
      console.log(num_layers);
      const layer_thicknesses = updatedLayers.map(
        (layer: any) => layer.endDepth - layer.startDepth
      );
      const vels_shear = updatedLayers.map((layer: any) => layer.velocity);

      console.log("Layer thicknesses:", layer_thicknesses);
      console.log("Velocities:", vels_shear);
      const vels = CalcCurve(
        periods,
        num_layers,
        layer_thicknesses,
        vels_shear,
        Math.max(axisLimits.ymin-50, 10),
        axisLimits.ymax+10
      );
      console.log("Periods", periods);
      console.log("Vels:", vels);
      setVels(vels);
      setPeriods(periods);
      // if (vels.length > 0 && vels.every((v) => v !== null))
      //   setAxisLimits((prev) => ({
      //     ...prev,
      //     ymin: Math.min(...vels),
      //     ymax: Math.max(...vels),
      //   }));
    }
  }, [
    updatedLayers,
    phase_vel_min,
    phase_vel_max,
    axisLimits.xmin,
    axisLimits.xmax,
  ]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const newPoints = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [x, y] = line.split(",").map((num) => parseFloat(num.trim()));
        return { x, y }; // x is period (second value), y is velocity (first value)
      })
      .filter((point) => !isNaN(point.x) && !isNaN(point.y));
    console.log("Parsed data:", newPoints);
    if (newPoints.length > 0) {
      const xValues = newPoints.map((p) => p.x);
      const yValues = newPoints.map((p) => p.y);

      const xmin = Math.min(...xValues);
      const xmax = Math.max(...xValues);
      const ymin = Math.min(...yValues);
      const ymax = Math.max(...yValues);

      setAxisLimits({
        xmin: xmin,
        xmax: xmax,
        ymin: ymin,
        ymax: ymax,
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max Velocity:
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
                Min Velocity:
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max Period:
              </label>
              <input
                type="number"
                value={axisLimits.xmax}
                onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="0.1"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min Period:
              </label>
              <input
                type="number"
                value={axisLimits.xmin}
                onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <input
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 mb-4
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
        />

        <div
          className="relative border border-gray-200 rounded-lg bg-white shadow-sm w-full aspect-[4/3] min-h-[300px]"
          ref={plotRef}
        >
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-sm">
            Velocity (m/s)
          </div>

          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm">
            Period (s)
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
                      const screenX =
                        ((point.x - axisLimits.xmin) /
                          (axisLimits.xmax - axisLimits.xmin)) *
                        plotDimensions.width;
                      const screenY =
                        plotDimensions.height -
                        ((point.y - axisLimits.ymin) /
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
                        const screenX =
                          ((period - axisLimits.xmin) /
                            (axisLimits.xmax - axisLimits.xmin)) *
                          plotDimensions.width;
                        const screenY =
                          plotDimensions.height -
                          ((vels[index] - axisLimits.ymin) /
                            (axisLimits.ymax - axisLimits.ymin)) *
                            plotDimensions.height;
                        if (index === 0) {
                          g.moveTo(screenX, screenY);
                          // console.log("Drawing", screenX, screenY);
                        } else {
                          g.lineTo(screenX, screenY);
                          // console.log("Drawing Lines", screenX, screenY);
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
                  ((hoveredPoint.x - axisLimits.xmin) /
                    (axisLimits.xmax - axisLimits.xmin)) *
                    plotDimensions.width +
                  2,
                top:
                  plotDimensions.height -
                  ((hoveredPoint.y - axisLimits.ymin) /
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
                {`(${hoveredPoint.x.toFixed(3)}, ${hoveredPoint.y.toFixed(3)})`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
