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

interface PickData {
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
    displayUnits,
    ToMeter,
    ToFeet
  } = useDisper();
  
  const [periods, setPeriods] = useState<(number|null)[]>([]);
  const [velocities, setVelocities] = useState<(number|null)[]>([]);
  
  const [curvePoints, setCurvePoints] = useState<Point[]>([]);
  const [pickPoints, setPickPoints] = useState<Point[]>([]);
  
  const [pickData, setPickData] = useState<PickData[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [numPoints, setNumPoints] = useState<number>(10);
  const [rmseVel, setRmseVel] = useState<number | null>(null);
  const [rmseSlowness, setRmseSlowness] = useState<number | null>(null);
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
  const [velocityUnit, setVelocityUnit] = useState<'velocity' | 'slowness'>('velocity');
  const [periodUnit, setPeriodUnit] = useState<'period' | 'frequency'>('period');
  const [velocityReversed, setVelocityReversed] = useState(false);
  const [periodReversed, setPeriodReversed] = useState(false);
  const [axesSwapped, setAxesSwapped] = useState(false);

  const convertUnit = (value: number, from: string, to: string): number => {
    if (from === to) return value;
    if (value === 0) return 0;
    
    // Handle period/frequency conversion
    if ((from === 'period' && to === 'frequency') || 
        (from === 'frequency' && to === 'period')) {
      return 1 / value;
    }
    
    // Handle velocity/slowness conversion
    if ((from === 'velocity' && to === 'slowness') || 
        (from === 'slowness' && to === 'velocity')) {
      return 1 / value;
    }
    
    return value;
  };

  const convertToPlotPoints = (
    rawData: PickData[],
    currentPeriodUnit: 'period' | 'frequency',
    currentVelocityUnit: 'velocity' | 'slowness'
  ): Point[] => {
    return rawData.map((data) => {
      const x = currentPeriodUnit === 'frequency' 
        ? data.frequency 
        : convertUnit(data.frequency, 'frequency', 'period');
      
      const y = currentVelocityUnit === 'slowness'
        ? data.slowness
        : convertUnit(data.slowness, 'slowness', 'velocity');

      return { x, y, screenY: 0 }; // Added screenY property
    }).filter(point => !isNaN(point.x) && !isNaN(point.y) && point.x > 0 && point.y > 0)
    .sort((a,b) => a.x - b.x);
  };

  const updateAxisLimits = (
    plotPoints: Point[], 
    periodUnit: 'period' | 'frequency',
    velocityUnit: 'velocity' | 'slowness'
  ) => {
    if (plotPoints.length === 0) return null;

    const xValues = plotPoints.map((p) => p.x);
    const yValues = plotPoints.map((p) => p.y);
    // Ensure we only consider positive values
    const minX = Math.max(0, Math.min(...xValues));
    const maxX = Math.max(0, Math.max(...xValues));
    const minY = Math.max(0, Math.min(...yValues));
    const maxY = Math.max(0, Math.max(...yValues));

    const yMarginFactor = velocityUnit === 'velocity' 
        ? { min: VELOCITY_MIN_MARGIN_FACTOR, max: VELOCITY_MAX_MARGIN_FACTOR }
        : { min: 0.9, max: 1.1 }; // Reversed for slowness

    // Define minimum limits based on units
    const xMinLimit = periodUnit === 'period' ? 0.001 : 0.1;
    const yMinLimit = velocityUnit === 'velocity' ? 30 : 0.0001;

    // For period/frequency (x-axis)
    const xmin = periodUnit === 'period' 
        ? Math.max(xMinLimit, Math.round(minX * 1000) / 1000)
        : Math.max(xMinLimit, Math.round(minX * 10) / 10);

    const xmax = periodUnit === 'period'
        ? Math.max(xmin + 0.001, Math.round(maxX * 1000) / 1000)
        : Math.max(xmin + 0.1, Math.round(maxX * 10) / 10);

    // For velocity/slowness (y-axis)
    let ymin, ymax;
    
    if (velocityUnit === 'velocity') {
        ymin = Math.max(yMinLimit, Math.floor(minY * yMarginFactor.min));
        ymax = Math.max(ymin + 10, Math.ceil(maxY * yMarginFactor.max));
    } else {
        // For slowness, we want to expand the range by 10% on both sides
        ymin = Math.max(yMinLimit, Math.round(minY * yMarginFactor.min * 10000) / 10000);
        ymax = Math.max(ymin + 0.0001, Math.round(maxY * yMarginFactor.max * 10000) / 10000);
    }

    return { 
        xmin: Math.max(0, xmin), 
        xmax: Math.max(xmin + (periodUnit === 'period' ? 0.001 : 0.1), xmax), 
        ymin: Math.max(0, ymin), 
        ymax: Math.max(ymin + (velocityUnit === 'velocity' ? 10 : 0.0001), ymax) 
    };
  };
  
  useEffect(() => {
    if (plotRef.current) {
      const { width, height } = plotRef.current.getBoundingClientRect();
      setPlotDimensions({ width, height });
    }
  }, []);

  // Helper function to generate evenly spaced points
  const generateEvenlySpacedPoints = (min: number, max: number, count: number): number[] => {
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  useEffect(() => {
    // Generate points that exactly match the axis limits
    const xValues = generateEvenlySpacedPoints(axisLimits.xmin, axisLimits.xmax, numPoints + 1);
    // Convert periods based on current unit before calculation
    const calcPeriods = periodUnit === 'frequency'
    ? xValues.map(p => convertUnit(p, 'frequency', 'period'))
    : xValues;

    let newPeriods;
    let pointIdxs: number[] | null = null;

    if(pickPoints.length > 0) {
      const newPointPeriods = pickPoints.map((point:Point) => periodUnit === 'frequency' ? convertUnit(point.x,'frequency', 'period') : point.x);   
      pointIdxs = Array(newPointPeriods.length);

      // Merge sorted arrays, tracking indices that match points so we can calculate RMSE later
      newPeriods = Array(newPointPeriods.length + calcPeriods.length)
      let i=0, j=0, k=0, l=0;
      while(i<newPointPeriods.length && j < calcPeriods.length) {
          if(newPointPeriods[i] < calcPeriods[j]) {
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
      while(i<newPointPeriods.length) {
          newPeriods[k] = newPointPeriods[i];
          pointIdxs[l] = k;
          i++;
          k++;
          l++;
      }
      while(j<calcPeriods.length) {
          newPeriods[k] = calcPeriods[j];
          j++;
          k++;
      }
      const oldNewPeriods = [...newPointPeriods, ...calcPeriods]
      oldNewPeriods.sort((a,b) => a - b)
    } else {
      newPeriods = calcPeriods
    }

    if (layers.length) {
      const num_layers = layers.length;
      const layer_thicknesses = layers.map(layer => layer.endDepth - layer.startDepth);
      const vels_shear = layers.map(layer => layer.velocity);
      const densities = layers.map(layer => layer.density);
      const vels_compression = vels_shear.map(v => v * Math.sqrt(3));

      // Convert velocity limits based on current unit
      const ymin = velocityUnit === 'slowness' 
        ? convertUnit(axisLimits.ymax, 'velocity', 'slowness')
        : axisLimits.ymin;
      const ymax = velocityUnit === 'slowness'
        ? convertUnit(axisLimits.ymin, 'velocity', 'slowness')
        : axisLimits.ymax;

      const model = new VelModel(
        num_layers,
        layer_thicknesses,
        densities,
        vels_compression,
        vels_shear,
        Math.max(ymin - (velocityUnit === 'slowness' ? -0.0001 : 50), velocityUnit === 'slowness' ? 0.0001 : 10),
        ymax + (velocityUnit === 'slowness' ? 0.0001 : 10),
        2.0
      );

      const calculatedVs30 = model.get_vs30();
      const formattedAsceVersion = asceVersion.toLowerCase().replace(/[- ]/g, "_");
      const calculatedSiteClass = VelModel.calc_site_class(formattedAsceVersion, calculatedVs30);

      setVs30(calculatedVs30);
      setSiteClass(calculatedSiteClass);

      const newVelocities = CalcCurve(
        newPeriods,
        num_layers,
        layer_thicknesses,
        vels_shear,
        Math.max(ymin - (velocityUnit === 'slowness' ? -0.0001 : 50), velocityUnit === 'slowness' ? 0.0001 : 10),
        ymax + (velocityUnit === 'slowness' ? 0.0001 : 10),
        2.0,
        densities
      );

      if(pointIdxs != null) {
        const curveVels = pointIdxs.map((i) => newVelocities[i])
        const pointVels:number[] = pickPoints.map((p) => velocityUnit === 'slowness' ? convertUnit(p.y, 'slowness','velocity') : p.y)
        console.log("PointVels:", pointVels)

        // Calculate RMSE for velocity
        const diffSquaredVelArr = pointVels
          .map((pointVel, index) => {
            const curveVel = curveVels[index]
            if(curveVel != null) {
              return (curveVel-pointVel)**2
            } else {
              return null
            }
          })
          .filter(a=> a != null);

        if(diffSquaredVelArr.length > 0) {
          setRmseVel(Math.sqrt(diffSquaredVelArr.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / diffSquaredVelArr.length))
        } else {
          setRmseVel(null)
        }

        // Slowness RMSE calculation removed
      }

      console.log("newVelocities:", newVelocities)
      setPeriods(newPeriods.sort((a:any, b:any) => a - b));
      setVelocities(newVelocities.sort((a:any, b:any) => a - b));
    }
  }, [layers, axisLimits.xmin, axisLimits.xmax, axisLimits.ymin, axisLimits.ymax, numPoints, pickPoints, asceVersion, velocityUnit, periodUnit]);

  useEffect(() => {
    const newCurvePoints: Point[] = periods
      .map((period, index) => {
        if (period === null || velocities[index] === null) return null;
        
        try {
          // Convert x-axis (period/frequency)
          const x = periodUnit === 'frequency' 
            ? convertUnit(period, 'period', 'frequency')
            : period;
          
          // Convert y-axis (velocity/slowness)
          const y = velocityUnit === 'slowness'
            ? convertUnit(velocities[index], 'velocity', 'slowness')
            : velocities[index];
            
          return { x, y };
        } catch (error) {
          console.warn('Error converting point:', error);
          return null;
        }
      })
      .filter((point): point is Point => 
        point !== null && 
        !isNaN(point.x) && 
        !isNaN(point.y) && 
        point.x > 0 && 
        point.y > 0
      );
      
    setCurvePoints(newCurvePoints);
  }, [periods, velocities, periodUnit, velocityUnit]);

  useEffect(() => {
    if (!pickData.length) return;
    
    const newPickPoints = convertToPlotPoints(pickData, periodUnit, velocityUnit);
    const newAxisLimits = updateAxisLimits(newPickPoints, periodUnit, velocityUnit);
    
    if (newAxisLimits) {
      setAxisLimits(newAxisLimits);
      setPickPoints(newPickPoints);
    }
  }, [pickData, velocityUnit, periodUnit]); 

  const handleFileUpload = async (
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

  const handleUnitChange = (
    type: 'velocity' | 'period',
    newUnit: string
  ) => {
    const updateFn = type === 'velocity' ? setVelocityUnit : setPeriodUnit;
    const currentUnit = type === 'velocity' ? velocityUnit : periodUnit;
    
    if (newUnit !== currentUnit) {
      updateFn(newUnit as any);
      setAxisLimits(prev => ({
        ...prev,
        [type === 'velocity' ? 'ymin' : 'xmin']: convertUnit(
          prev[type === 'velocity' ? 'ymax' : 'xmax'],
          currentUnit,
          newUnit
        ),
        [type === 'velocity' ? 'ymax' : 'xmax']: convertUnit(
          prev[type === 'velocity' ? 'ymin' : 'xmin'],
          currentUnit,
          newUnit
        ),
      }));
    }
  };

  const handleAxisLimitChange = (
    axis: "xmin" | "xmax" | "ymin" | "ymax",
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    // Different validation rules based on unit type and axis
    if (axis.startsWith('x')) {
      // Period/Frequency limits
      const minLimit = periodUnit === 'period' ? 0.001 : 0.1;
      if (axis === 'xmin' && numValue < minLimit) return;
      
      setAxisLimits(prev => ({
        ...prev,
        [axis]: numValue,
        // Ensure max is greater than min
        ...(axis === 'xmin' && numValue >= prev.xmax ? { xmax: numValue + 0.1 } : {}),
        ...(axis === 'xmax' && numValue <= prev.xmin ? { xmin: numValue - 0.1 } : {})
      }));
    } else {
      // Velocity/Slowness limits
      const minLimit = velocityUnit === 'velocity' ? 30 : 0.0001;
      if (axis === 'ymin' && numValue < minLimit) return;

      // Convert input value from display units to meters
      const valueInMeters = displayUnits === 'ft' ? ToMeter(numValue) : numValue;

      setAxisLimits(prev => ({
        ...prev,
        [axis]: valueInMeters,
        // Ensure max is greater than min
        ...(axis === 'ymin' && valueInMeters >= prev.ymax ? 
          { ymax: valueInMeters + (velocityUnit === 'velocity' ? 10 : 0.001) } : {}),
        ...(axis === 'ymax' && valueInMeters <= prev.ymin ? 
          { ymin: valueInMeters - (velocityUnit === 'velocity' ? 10 : 0.001) } : {})
      }));
    }
  };

  const displayRMSE = () => {
    if (rmseVel !== null) {
      return displayUnits === 'ft' ? 
        `${(rmseVel * 3.28084).toFixed(2)} ft/s` : 
        `${rmseVel.toFixed(2)} m/s`;
    }
    return 'N/A';
  };

  const handleSwapAxes = () => {
    setAxesSwapped(prev => !prev);
    // setAxisLimits(prev => ({
    //   xmin: prev.ymin,
    //   xmax: prev.ymax,
    //   ymin: prev.xmin,
    //   ymax: prev.xmax
    // }));
  };

  const handleReverseAxis = (type: 'velocity' | 'period') => {
    if (type === 'velocity') {
      setVelocityReversed(prev => !prev);
      // setAxisLimits(prev => ({
      //   ...prev,
      //   ymin: prev.ymax,
      //   ymax: prev.ymin
      // }));
    } else {
      setPeriodReversed(prev => !prev);
      // setAxisLimits(prev => ({
      //   ...prev,
      //   xmin: prev.xmax,
      //   xmax: prev.xmin
      // }));
    }
  };

  const calculateTooltipPosition = (point: Point) => {
    let xValue = point.x;
    let yValue = point.y;
    
    // Convert units
    if (periodUnit === 'frequency') {
      xValue = convertUnit(xValue, 'period', 'frequency');
    }
    if (velocityUnit === 'slowness') {
      yValue = convertUnit(yValue, 'velocity', 'slowness');
    }

    // Calculate initial screen coordinates
    let screenX = ((xValue - axisLimits.xmin) / 
      (axisLimits.xmax - axisLimits.xmin)) * 
      plotDimensions.width;
    
    let screenY = ((yValue - axisLimits.ymin) / 
      (axisLimits.ymax - axisLimits.ymin)) * 
      plotDimensions.height;

    // Handle axis reversals
    if (periodReversed) {
      screenX = plotDimensions.width - screenX;
    }
    if (!velocityReversed) {
      screenY = plotDimensions.height - screenY;
    }

    // Handle axis swapping
    if (axesSwapped) {
      [screenX, screenY] = [screenY, screenX];
    }

    // Calculate offset directions based on position in plot
    const OFFSET = 20;
    const xOffset = screenX > plotDimensions.width / 2 ? -OFFSET : OFFSET;
    const yOffset = screenY > plotDimensions.height / 2 ? -OFFSET : OFFSET;
    let style:any = {};
    if (periodUnit === 'frequency') {
      style['right'] = `${Math.abs(screenX + xOffset)}px`;
    } else {
      style['left'] = `${screenX + xOffset}px`;
    }
    if (periodUnit === 'frequency') {
      style['bottom'] = `${Math.abs(screenY + yOffset)}px`;
    } else {
      style['top'] = `${screenY + yOffset}px`;
    }

    return style;
  };

  return (
    <div className="flex flex-col items-center border-2 border-gray-300 rounded-lg p-4 shadow-sm">
      <div className="w-full">
        <div className="flex gap-4 flex-wrap justify-center mb-4">
          <div className="flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={velocityUnit}
                onChange={(e) => handleUnitChange('velocity', e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="velocity">Velocity ({displayUnits}/s)</option>
                <option value="slowness">Slowness (s/{displayUnits})</option>
              </select>
              <button
                onClick={() => handleReverseAxis('velocity')}
                className={`px-2 py-1 text-sm border rounded transition-colors duration-200
                  ${velocityReversed ? 
                    'bg-blue-500 text-white hover:bg-blue-600' : 
                    'bg-gray-100 hover:bg-gray-200'}`}
                title={`Reverse ${axesSwapped ? 'Horizontal' : 'Vertical'} Axis`}
              >
                {axesSwapped ? '←→' : '↑↓'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Max {velocityUnit === 'velocity' ? 'Velocity' : 'Slowness'}:
              </label>
              <input
                type="number"
                value={displayUnits === 'ft' ? 
                  ToFeet(axisLimits.ymax) : 
                  axisLimits.ymax}
                onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={velocityUnit === 'velocity' ? "1" : "0.0001"}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                Min {velocityUnit === 'velocity' ? 'Velocity' : 'Slowness'}:
              </label>
              <input
                type="number"
                value={displayUnits === 'ft' ? 
                  ToFeet(axisLimits.ymin) : 
                  axisLimits.ymin}
                onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                step={velocityUnit === 'velocity' ? "1" : "0.0001"}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={periodUnit}
                onChange={(e) => handleUnitChange('period', e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="period">Period (s)</option>
                <option value="frequency">Frequency (Hz)</option>
              </select>
              <button
                onClick={() => handleReverseAxis('period')}
                className={`px-2 py-1 text-sm border rounded transition-colors duration-200
                  ${periodReversed ? 
                    'bg-blue-500 text-white hover:bg-blue-600' : 
                    'bg-gray-100 hover:bg-gray-200'}`}
                title={`Reverse ${axesSwapped ? 'Vertical' : 'Horizontal'} Axis`}
              >
                {axesSwapped ? '↑↓' : '←→'}
              </button>
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
                step={periodUnit === 'period' ? "0.001" : "0.1"}
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
                step={periodUnit === 'period' ? "0.001" : "0.1"}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={handleSwapAxes}
            className={`px-3 py-1 text-sm border rounded transition-colors duration-200
              ${axesSwapped ? 
                'bg-blue-500 text-white hover:bg-blue-600' : 
                'bg-gray-100 hover:bg-gray-200'}`}
            title="Swap Axes"
          >
            Swap Axes
          </button>
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
          <div className={`absolute ${axesSwapped ? '-bottom-8 left-1/2 -translate-x-1/2' : '-left-12 top-1/2 -translate-y-1/2 -rotate-90'} text-sm flex items-center gap-2`}>
            <span className="px-2 py-1 text-sm">
              {velocityUnit === 'velocity' ? `Velocity (${displayUnits}/s)` : `Slowness (s/${displayUnits})`}
            </span>
          </div>

          <div className={`absolute ${axesSwapped ? '-left-12 top-1/2 -translate-y-1/2 -rotate-90' : '-bottom-8 left-1/2 -translate-x-1/2'} text-sm flex items-center gap-2`}>
            <span className="px-2 py-1 text-sm">
              {periodUnit === 'period' ? 'Period (s)' : 'Frequency (Hz)'}
            </span>
          </div>

          {/* Y-axis numbers */}
          <div className="absolute -left-8 top-0 h-full flex flex-col justify-between">
            <div className="text-xs">
              {axesSwapped ? 
                (periodReversed ? 
                  (
                    axisLimits.xmin.toFixed(4) 
                  ) : 
                  (
                    axisLimits.xmax.toFixed(4)
                  )
                ) : 
                (displayUnits === 'ft' ? 
                  ToFeet(velocityReversed ? axisLimits.ymin : axisLimits.ymax).toFixed(4) : 
                  (velocityReversed ? axisLimits.ymin : axisLimits.ymax).toFixed(4)
                )}
            </div>
            <div className="text-xs">
              {axesSwapped ? 
                (periodReversed ? 
                  (
                    axisLimits.xmax.toFixed(4)
                  ) : 
                  (
                    axisLimits.xmin.toFixed(4)
                  )
                ) : 
                (displayUnits === 'ft' ? 
                  ToFeet(velocityReversed ? axisLimits.ymax : axisLimits.ymin).toFixed(4) : 
                  (velocityReversed ? axisLimits.ymax : axisLimits.ymin).toFixed(4)
                )}
            </div>
          </div>

          {/* X-axis numbers */}
          <div className="absolute -bottom-6 left-0 w-full flex justify-between">
            <div className="text-xs">
              {axesSwapped ? 
                (displayUnits === 'ft' ? 
                  ToFeet(velocityReversed ? axisLimits.ymax : axisLimits.ymin).toFixed(4) : 
                  (velocityReversed ? axisLimits.ymax : axisLimits.ymin).toFixed(4)
                ) : 
                (periodReversed ? 
                  (
                    axisLimits.xmax.toFixed(4) 
                  ) : 
                  ( 
                    axisLimits.xmin.toFixed(4)
                  )
                )}
            </div>
            <div className="text-xs">
              {axesSwapped ? 
                (displayUnits === 'ft' ? 
                  ToFeet(velocityReversed ? axisLimits.ymin : axisLimits.ymax).toFixed(4) : 
                  (velocityReversed ? axisLimits.ymin : axisLimits.ymax).toFixed(4)
                ) : 
                (periodReversed ? 
                  (
                    axisLimits.xmin.toFixed(4) 
                  ) : 
                  (
                    axisLimits.xmax.toFixed(4)
                  )
                )}
            </div>
          </div>

          {plotRef.current && (
            <Application
              className="w-full h-full"
              width={plotDimensions.width}
              height={plotDimensions.height}
              background="white"
            >
              <pixiContainer>
                {pickPoints.map((point, index) => (
                  <pixiGraphics
                    key={`point-${index}`}
                    draw={(g: Graphics) => {
                      g.clear();
                      let screenX = ((point.x - axisLimits.xmin) /
                          (axisLimits.xmax - axisLimits.xmin)) *
                        plotDimensions.width;
                      
                      let screenY = ((point.y - axisLimits.ymin) /
                          (axisLimits.ymax - axisLimits.ymin)) *
                          plotDimensions.height;

                      // Handle axis reversals
                      if (periodReversed) {
                        screenX = plotDimensions.width - screenX;
                      }
                      
                      if (!velocityReversed) {
                        screenY = plotDimensions.height - screenY;
                      }

                      // Handle axis swapping if needed
                      if (axesSwapped) {
                        [screenX, screenY] = [screenY, screenX];
                      }

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

                    // Draw curve points
                    curvePoints.forEach((point, index) => {
                      // Ensure proper scaling to fill the entire plot
                      let screenX = ((point.x - axisLimits.xmin) /
                          (axisLimits.xmax - axisLimits.xmin)) *
                        plotDimensions.width;
                      
                      let screenY = ((point.y - axisLimits.ymin) /
                          (axisLimits.ymax - axisLimits.ymin)) *
                          plotDimensions.height;

                      // Handle axis reversals
                      if (periodReversed) {
                        screenX = plotDimensions.width - screenX;
                      }
                      
                      if (!velocityReversed) {
                        screenY = plotDimensions.height - screenY;
                      }

                      // Handle axis swapping if needed
                      if (axesSwapped) {
                        [screenX, screenY] = [screenY, screenX];
                      }

                      if (index === 0) {
                        g.moveTo(screenX, screenY);
                      } else {
                        g.lineTo(screenX, screenY);
                      }
                    });
                    g.stroke();
                  }}
                />
              </pixiContainer>
            </Application>
          )}

          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-white px-2 py-1 text-sm border rounded shadow-sm"
              style={calculateTooltipPosition(hoveredPoint)}
            >
              {(() => {
                // Handle x-axis (period/frequency) conversion
                let xValue = hoveredPoint.x;
                if (periodUnit === 'frequency') {
                  xValue = convertUnit(xValue, 'period', 'frequency');; // Convert period to frequency
                }

                // Handle y-axis (velocity/slowness) conversion
                let yValue = hoveredPoint.y;
                if (velocityUnit === 'slowness') {
                  yValue = convertUnit(yValue, 'velocity', 'slowness'); // Convert velocity to slowness
                }
                
                // Convert to display units if needed
                if (displayUnits === 'ft') {
                  if (velocityUnit === 'velocity') {
                    yValue = ToFeet(yValue);
                  } else { // slowness
                    yValue = yValue / 3.28084; // Convert s/m to s/ft
                  }
                }
                
                // Set precision based on unit type
                const xPrecision = periodUnit === 'period' ? 3 : 1;
                const yPrecision = velocityUnit === 'velocity' ? 1 : 6;
                
                // Format the display string
                return `(${xValue.toFixed(xPrecision)} ${periodUnit === 'period' ? 's' : 'Hz'}, ${
                  yValue.toFixed(yPrecision)
                } ${velocityUnit === 'velocity' ? `${displayUnits}/s` : `s/${displayUnits}`})`;
              })()}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 p-4 border-t border-gray-200">
        <div className="flex justify-center space-x-8">
          <div className="text-center">
            <span className="font-semibold">Vs30:</span>{" "}
            <span className="font-bold">{vs30? displayUnits === 'ft' ? `${ToFeet(vs30)} ft/s`:`${vs30} m/s`: 'N/A'}</span>
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
