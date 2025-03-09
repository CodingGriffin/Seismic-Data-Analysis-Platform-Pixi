import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import NpyJs from 'npyjs';
import { NpyData, RGB, Point, ColorStop, AxisData, PickData, Matrix } from '../types';

const npArrayToJS = (flatArray: number[] , shape: number[]) => {
  const [rows, cols] = shape;
  let result: number[][] = [];

  for (let i = 0; i < rows; i++) {
      result.push(Array.from(flatArray.slice(i * cols, (i + 1) * cols), value => Number(value)));
  }

  return { matrix: result, shape };
};

const rotateClockwise = (matrix: number[][]): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;

  let rotated: number[][] = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
          rotated[c][rows - 1 - r] = matrix[r][c];
      }
  }

  return { matrix: rotated, shape: [cols, rows] };
};

const rotateCounterClockwise = (matrix: number[][]): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;

  let rotated: number[][] = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
          rotated[cols - 1 - c][r] = matrix[r][c];
      }
  }

  return { matrix: rotated, shape: [cols, rows] };
};


const flipVertical = (matrix: number[][]): Matrix => {
  let flipped = [...matrix].reverse();
  return { matrix: flipped, shape: [matrix.length, matrix[0].length] };
};

const flipHorizontal = (matrix: number[][]): Matrix => {
  let flipped = matrix.map(row => [...row].reverse());
  return { matrix: flipped, shape: [matrix.length, matrix[0].length] };
};


export const COLOR_MAPS = {
  // 'RdYlBu': [
  //   'rgb(165,0,38)',
  //   'rgb(215,48,39)',
  //   'rgb(244,109,67)',
  //   'rgb(253,174,97)',
  //   'rgb(254,224,144)',
  //   'rgb(255,255,191)',
  //   'rgb(224,243,248)',
  //   'rgb(171,217,233)',
  //   'rgb(116,173,209)',
  //   'rgb(69,117,180)',
  //   'rgb(49,54,149)'
  // ],
  'RdYlBu': [
    'rgb(165,0,38, 0.0)',
    'rgb(215,48,39, 0.2)',
    'rgb(253,174,97, 0.5)',
    'rgb(224,243,248, 0.8)',
    'rgb(171,217,233, 0.9)',
    'rgb(49,54,149, 1.0)'
  ],
  'Spectral': [
    'rgb(158,1,66, 0.0)',
    'rgb(213,62,79, 0.1)',
    'rgb(244,109,67,0.2)',
    'rgb(253,174,97,0.3)',
    'rgb(254,224,139,0.4)',
    'rgb(255,255,191, 0.5)',
    'rgb(230,245,152, 0.6)',
    'rgb(171,221,164, 0.7)',
    'rgb(102,194,165, 0.8)',
    'rgb(50,136,189, 0.9)',
    'rgb(94,79,162, 1.0)'
  ],
  'PuOr': [
    'rgb(127,59,8, 0.0)',
    'rgb(179,88,6, 0.1)',
    'rgb(224,130,20, 0.2)',
    'rgb(253,184,99, 0.3)',
    'rgb(254,224,182, 0.4)',
    'rgb(247,247,247, 0.5)',
    'rgb(216,218,235, 0.6)',
    'rgb(178,171,210, 0.7)',
    'rgb(128,115,172, 0.8)',
    'rgb(84,39,136, 0.9)',
    'rgb(45,0,75, 1.0)'
  ],
  'RdGy': [
    'rgb(103,0,31, 0.0)',
    'rgb(178,24,43, 0.1)',
    'rgb(214,96,77, 0.2)',
    'rgb(244,165,130, 0.3)',
    'rgb(253,219,199, 0.4)',
    'rgb(255,255,255, 0.5)',
    'rgb(224,224,224, 0.6)',
    'rgb(186,186,186, 0.7)',
    'rgb(135,135,135, 0.8)',
    'rgb(77,77,77, 0.9)',
    'rgb(26,26,26, 1.0)'
  ]
} as const;

export type ColorMapKey = keyof typeof COLOR_MAPS;

export interface ImageTransform {
  type:'flipHorizontal'|'flipVertical'|'rotationCounterClockwise'|'rotationClockwise';
  rectSize:{
    width:number,
    height:number
  }
}

interface AxisLimits {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

interface TextureData {
  transformed: number[][];
  dimensions: { width: number; height: number };
}
// Function to parse 'rgb(r,g,b, position)' strings
const parseColorStop = (colorStop: string): ColorStop => {
  const match = colorStop.match(/rgb\((\d+),(\d+),(\d+),\s*([\d.]+)\)/);
  if (!match) throw new Error(`Invalid color stop format: ${colorStop}`);

  return {
    color: { r: +match[1], g: +match[2], b: +match[3] },
    position: +match[4],
  };
};

// Linear interpolation between two RGB colors
const interpolateRGB = (color1: RGB, color2: RGB, ratio: number): RGB => {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * ratio),
    g: Math.round(color1.g + (color2.g - color1.g) * ratio),
    b: Math.round(color1.b + (color2.b - color1.b) * ratio)
  };
};

// Get color for a normalized value using a non-uniform color map
export const getColorFromMap = (normalizedValue: number, colorMap: string[]): RGB => {
  const colorStops = colorMap.map(parseColorStop);

  // Find the two surrounding colors for interpolation
  for (let i = 0; i < colorStops.length - 1; i++) {
    const start = colorStops[i];
    const end = colorStops[i + 1];

    if (normalizedValue >= start.position && normalizedValue <= end.position) {
      // Calculate the interpolation ratio within this segment
      const segmentRatio = (normalizedValue - start.position) / (end.position - start.position);
      return interpolateRGB(start.color, end.color, segmentRatio);
    }
  }

  // If the value is out of range, return the closest boundary color
  return normalizedValue <= colorStops[0].position
    ? colorStops[0].color
    : colorStops[colorStops.length - 1].color;
};

// Initial state
const initialState = {
  textureData : null as TextureData | null,
  error: null as string | null,
  isLoading: false,
  points: [] as Point[],
  hoveredPoint: null as Point | null,
  isDragging: false,
  draggedPoint: null as Point | null,
  selectedColorMap: 'RdYlBu' as ColorMapKey,
  axisLimits: {
    xmin: 0,
    xmax: 0.015,
    ymin: 0,
    ymax: 20
  },
  gridData: null as NpyData | null,
  frequencyData: null as NpyData | null,
  slownessData: null as NpyData | null,
  xAxis: null as AxisData | null,
  yAxis: null as AxisData | null,
  coordinateMatrix:[
    [0,0,0,0,0],//top
    [0,0,1,0,0],//y-axis is freq
    [0,0,0,0,0],//left, right
    [0,0,1,0,0],
    [0,0,0,0,0]//bottom
  ],
  pickData:[] as PickData[]
};

// Action types
type Action =
  | { type: 'SET_TEXTURE_DATA'; payload: TextureData|null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_POINTS'; payload: Point[] }
  | { type: 'ADD_POINT'; payload: Point }
  | { type: 'UPDATE_POINT'; payload: { index: number; point: Point } }
  | { type: 'REMOVE_POINT'; payload: number }
  | { type: 'SET_HOVERED_POINT'; payload: Point | null }
  | { type: 'SET_IS_DRAGGING'; payload: boolean }
  | { type: 'SET_DRAGGED_POINT'; payload: Point | null }
  | { type: 'SET_COLOR_MAP'; payload: ColorMapKey }
  | { type: 'SET_IMAGE_TRANSFORM'; payload: Partial<ImageTransform> }
  | { type: 'SET_AXIS_LIMITS'; payload: Partial<AxisLimits> }
  | { type: 'SET_GRID_DATA'; payload: NpyData }
  | { type: 'SET_FREQUENCY_DATA'; payload: NpyData }
  | { type: 'SET_SLOWNESS_DATA'; payload: NpyData }
  | { type: 'SET_AXIS_DATA'; payload: { xAxis: AxisData | null; yAxis: AxisData | null } }
  | { type: 'SET_PICK_DATA'; payload: PickData[] }
  | { type: 'ADD_PICK_DATA'; payload:  PickData}
  | { type: 'UPDATE_PICK_DATA'; payload: { index: number; data:PickData  } }
  | { type: 'REMOVE_PICK_DATA'; payload: number }
  | { type: 'SET_COORDINATE_MATRIX'; payload: []}
// Reducer
function reducer(state: typeof initialState, action: Action): typeof initialState {
  switch (action.type) {
    case 'SET_TEXTURE_DATA':
      return { ...state, textureData: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_POINTS':
      return { ...state, points: action.payload };
    case 'ADD_POINT':
      return { ...state, points: [...state.points, action.payload] };
    case 'UPDATE_POINT':
      return {
        ...state,
        points: state.points.map((point, index) =>
          index === action.payload.index ? action.payload.point : point
        ),
      };
    case 'REMOVE_POINT':
      return {
        ...state,
        points: state.points.filter((_, index) => index !== action.payload),
      };
    case 'SET_PICK_DATA':
      return { ...state, pickData: action.payload };
    case 'ADD_PICK_DATA':
      return { ...state, pickData: [...state.pickData, action.payload] };
    case 'UPDATE_PICK_DATA':
      return {
        ...state,
        pickData: state.pickData.map((data, index) =>
          index === action.payload.index ? action.payload.data : data
        ),
      };
    case 'REMOVE_PICK_DATA':
      return {
        ...state,
        pickData: state.pickData.filter((_, index) => index !== action.payload),
      };
    case 'SET_HOVERED_POINT':
      return { ...state, hoveredPoint: action.payload };
    case 'SET_IS_DRAGGING':
      return { ...state, isDragging: action.payload };
    case 'SET_DRAGGED_POINT':
      return { ...state, draggedPoint: action.payload };
    case 'SET_COLOR_MAP':
      return { ...state, selectedColorMap: action.payload };
    case 'SET_IMAGE_TRANSFORM':
      if (!state.textureData ||!action.payload.rectSize||!action.payload.type) return { ... state}
      let transformedData:Matrix = {matrix:[], shape:[0,0]};
      let newCoordinate:Matrix = {matrix:[], shape:[0,0]};
      let points:Point[] = [];
      const {width, height} = action.payload.rectSize;
      const rate = width/height;

      switch (action.payload.type) {
        case 'flipHorizontal':
          transformedData = flipHorizontal([...state.textureData.transformed]);
          newCoordinate = flipHorizontal([...state.coordinateMatrix]);
          points = state.points.map((point:Point) => ({...point, x:width - point.x}))
          break;
        case 'flipVertical':
          transformedData = flipVertical([...state.textureData.transformed]);
          newCoordinate = flipVertical([...state.coordinateMatrix]);
          points = state.points.map((point:Point) => ({...point, y:height - point.y}))
          break;
        case 'rotationClockwise':
          transformedData = rotateClockwise([...state.textureData.transformed]);
          newCoordinate = rotateClockwise([...state.coordinateMatrix]);
          points = state.points.map((point:Point) => ({...point, x:(height - point.y)*rate, y:point.x/rate}))
          break;
        case 'rotationCounterClockwise':
          transformedData = rotateCounterClockwise([...state.textureData.transformed]);
          newCoordinate = rotateCounterClockwise([...state.coordinateMatrix]);
          points = state.points.map((point:Point) => ({...point, x:point.y*rate, y:(width - point.x)/rate}))
          break;
      }
      
      return {
        ...state,
        textureData:{
            transformed:transformedData.matrix,
            dimensions: {
              width: transformedData.shape[1],
              height: transformedData.shape[0]
            }        
        },
        coordinateMatrix:newCoordinate.matrix,
        points
      };
    case 'SET_AXIS_LIMITS':
      return {
        ...state,
        axisLimits: { ...state.axisLimits, ...action.payload },
      };
    case 'SET_GRID_DATA':
      return { ...state, gridData: action.payload };
    case 'SET_FREQUENCY_DATA':
      let newMatrixF = [...state.coordinateMatrix];
      newMatrixF[0][2] = action.payload.max;
      newMatrixF[4][2] = action.payload.min;

      return { 
        ...state, 
        frequencyData: action.payload,
        coordinateMatrix:newMatrixF
       };
    case 'SET_SLOWNESS_DATA':
      let newMatrixS = [...state.coordinateMatrix];
      newMatrixS[2][0] = action.payload.max;
      newMatrixS[2][4] = action.payload.min;

      return { 
        ...state, 
        slownessData: action.payload,
        coordinateMatrix:newMatrixS
      };
    case 'SET_AXIS_DATA':
      return {
        ...state,
        xAxis: action.payload.xAxis,
        yAxis: action.payload.yAxis,
      };
    case 'SET_COORDINATE_MATRIX':
      return {
        ...state,
        coordinateMatrix:action.payload
      }
    default:
      return state;
  }
}

// Context type
interface NpyViewerContextType {
  state: typeof initialState;
  setTextureData: (textureData: TextureData | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  addPoint: (point: Point) => void;
  updatePoint: (index: number, point: Point) => void;
  removePoint: (index: number) => void;
  setPoints: (points: Point[]) => void;
  setHoveredPoint: (point: Point | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setDraggedPoint: (point: Point | null) => void;
  setColorMap: (colorMap: ColorMapKey) => void;
  setImageTransform: (transform: Partial<ImageTransform>) => void;
  setAxisLimits: (limits: Partial<AxisLimits>) => void;
  setGridData: (data: NpyData) => void;
  setAxisData: (xAxis: AxisData | null, yAxis: AxisData | null) => void;
  loadNpyFile: (file: File, dataType:'freq'|'slow'|'grid') => Promise<void>;
  drawOrigin:() => void;
  top: () => number;
  bottom: () => number;
  left: () => number;
  right: () => number;
  isAxisSwapped: () => boolean;
  setCoordinateMatrix: (data:[]) => void;
}

// Create context
const NpyViewerContext = createContext<NpyViewerContextType | null>(null);

// Provider component
export function NpyViewerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Action creators
  const setTextureData = useCallback((textureData: TextureData | null) => {
    dispatch({ type: 'SET_TEXTURE_DATA', payload: textureData });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, []);

  const addPoint = useCallback((point: Point) => {
    dispatch({ type: 'ADD_POINT', payload: point });
  }, []);

  const updatePoint = useCallback((index: number, point: Point) => {
    dispatch({ type: 'UPDATE_POINT', payload: { index, point } });
  }, []);

  const removePoint = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_POINT', payload: index });
  }, []);

  const setPoints = useCallback((points: Point[]) => {
    dispatch({ type: 'SET_POINTS', payload: points });
  }, []);

  const setHoveredPoint = useCallback((point: Point | null) => {
    dispatch({ type: 'SET_HOVERED_POINT', payload: point });
  }, []);

  const setIsDragging = useCallback((isDragging: boolean) => {
    dispatch({ type: 'SET_IS_DRAGGING', payload: isDragging });
  }, []);

  const setDraggedPoint = useCallback((point: Point | null) => {
    dispatch({ type: 'SET_DRAGGED_POINT', payload: point });
  }, []);

  const setColorMap = useCallback((colorMap: ColorMapKey) => {
    dispatch({ type: 'SET_COLOR_MAP', payload: colorMap });
  }, []);

  const setImageTransform = useCallback((transform: Partial<ImageTransform>) => {
    dispatch({ type: 'SET_IMAGE_TRANSFORM', payload: transform });
  }, []);

  const setAxisLimits = useCallback((limits: Partial<AxisLimits>) => {
    dispatch({ type: 'SET_AXIS_LIMITS', payload: limits });
  }, []);

  const setGridData = useCallback((data: NpyData) => {
    dispatch({ type: 'SET_GRID_DATA', payload: data });
  }, []);

  const setFrequencyData = useCallback((data: NpyData) => {
    dispatch({ type: 'SET_FREQUENCY_DATA', payload: data });
  }, []);

  const setSlownessData = useCallback((data: NpyData) => {
    dispatch({ type: 'SET_SLOWNESS_DATA', payload: data });
  }, []);

  const setAxisData = useCallback((xAxis: AxisData | null, yAxis: AxisData | null) => {
    dispatch({ type: 'SET_AXIS_DATA', payload: { xAxis, yAxis } });
  }, []);

  const setCoordinateMatrix = useCallback((data:[]) => {
    dispatch({ type: 'SET_COORDINATE_MATRIX', payload: data})
  }, [])

  const loadNpyFile = useCallback(async (file: File, dataType:'freq'|'slow'|'grid') => {
    try {
      setError(null);
      
      const npyjs = new NpyJs();
      const arrayBuffer = await file.arrayBuffer();
      const npyData = await npyjs.load(arrayBuffer);

      const data = new Array(npyData.data.length);
      for (let i = 0; i < npyData.data.length; i++) {
        data[i] = Number(npyData.data[i]);
      }

      let min = Number(npyData.data[0]);
      let max = min;
      for (let i = 1; i < npyData.data.length; i++) {
        const val = Number(npyData.data[i]);
        if (val < min) min = val;
        if (val > max) max = val;
      }

      switch (dataType) {
        case 'freq':
          setFrequencyData({
            data,
            shape: npyData.shape,
            min,
            max
          });
          break;
        case 'slow':
          setSlownessData({
            data,
            shape: npyData.shape,
            min,
            max
          });
          break;
        case 'grid':
          const { matrix: jsMatrix, shape } = npArrayToJS(data, npyData.shape);
          setGridData({
            data: jsMatrix,
            shape: shape,
            min,
            max
          });
          break;
        default:
          break;
      }

      // Additional processing as needed...
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NPY file");
    }
  }, [setError, setLoading, setPoints, setGridData, setSlownessData, setFrequencyData, setCoordinateMatrix]);

  const drawOrigin = useCallback(() => {
    if (!state.gridData) return

    let { matrix: rotated } = rotateClockwise(state.gridData.data);
    let { matrix: transformed, shape} = flipVertical(rotated);

    setTextureData({
      transformed,
      dimensions: {
        width:shape[1],
        height:shape[0]
      }
    })
  }, [state.gridData])

  const top = () => state.coordinateMatrix[0][2];
  const bottom = () => state.coordinateMatrix[4][2];
  const left = () => state.coordinateMatrix[2][0];
  const right = () => state.coordinateMatrix[2][4];
  const isAxisSwapped = () => !state.coordinateMatrix[1][2];

  useEffect(() => {
    setAxisLimits({ymax: state.frequencyData?.max, ymin: state.frequencyData?.min})
  }, [state.frequencyData]);

  useEffect(() => {
    setAxisLimits({xmax: state.slownessData?.max, xmin: state.slownessData?.min})
  }, [state.slownessData]);

  useEffect(() => {
    
  }, [state.gridData])
  return (
    <NpyViewerContext.Provider
      value={{
        state,
        setTextureData,
        setError,
        setLoading,
        addPoint,
        updatePoint,
        removePoint,
        setPoints,
        setHoveredPoint,
        setIsDragging,
        setDraggedPoint,
        setColorMap,
        setImageTransform,
        setAxisLimits,
        setGridData,
        setAxisData,
        loadNpyFile,
        drawOrigin,
        top,
        bottom,
        left,
        right,
        isAxisSwapped,
        setCoordinateMatrix
      }}
    >
      {children}
    </NpyViewerContext.Provider>
  );
}

// Custom hook
export function useNpyViewer() {
  const context = useContext(NpyViewerContext);
  if (!context) {
    throw new Error('useNpyViewer must be used within a NpyViewerProvider');
  }
  return context;
}
