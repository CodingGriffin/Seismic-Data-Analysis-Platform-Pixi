import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Texture } from 'pixi.js';
import NpyJs from 'npyjs';

// Types
interface Point {
  x: number;
  y: number;
  axisX: number;
  axisY: number;
  value: number;
  color: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface AxisData {
  data: Float32Array | Float64Array;
  shape: number[];
}

interface NpyData {
  data: Float32Array | Float64Array | Uint8Array | Uint16Array | Int8Array | Int16Array | Int32Array | BigUint64Array | BigInt64Array;
  shape: number[];
  min: number;
  max: number;
}

type ColorMapKey = 'RdYlBu' | 'Spectral' | 'PuOr' | 'RdGy';

interface ImageTransform {
  flipHorizontal: boolean;
  flipVertical: boolean;
  rotationCounterClockwise: boolean;
  rotationClockwise: boolean;
}

interface AxisLimits {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

// Initial state
const initialState = {
  texture: null as Texture | null,
  error: null as string | null,
  isLoading: false,
  points: [] as Point[],
  hoveredPoint: null as Point | null,
  isDragging: false,
  draggedPoint: null as Point | null,
  selectedColorMap: 'RdYlBu' as ColorMapKey,
  imageTransform: {
    flipHorizontal: false,
    flipVertical: false,
    rotationCounterClockwise: false,
    rotationClockwise: false
  },
  axisLimits: {
    xmin: 0,
    xmax: 0.015,
    ymin: 0,
    ymax: 20
  },
  originalData: null as NpyData | null,
  xAxis: null as AxisData | null,
  yAxis: null as AxisData | null,
};

// Action types
type Action =
  | { type: 'SET_TEXTURE'; payload: Texture | null }
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
  | { type: 'SET_ORIGINAL_DATA'; payload: NpyData }
  | { type: 'SET_AXIS_DATA'; payload: { xAxis: AxisData | null; yAxis: AxisData | null } };

// Reducer
function reducer(state: typeof initialState, action: Action): typeof initialState {
  switch (action.type) {
    case 'SET_TEXTURE':
      return { ...state, texture: action.payload };
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
    case 'SET_HOVERED_POINT':
      return { ...state, hoveredPoint: action.payload };
    case 'SET_IS_DRAGGING':
      return { ...state, isDragging: action.payload };
    case 'SET_DRAGGED_POINT':
      return { ...state, draggedPoint: action.payload };
    case 'SET_COLOR_MAP':
      return { ...state, selectedColorMap: action.payload };
    case 'SET_IMAGE_TRANSFORM':
      return {
        ...state,
        imageTransform: { ...state.imageTransform, ...action.payload },
      };
    case 'SET_AXIS_LIMITS':
      return {
        ...state,
        axisLimits: { ...state.axisLimits, ...action.payload },
      };
    case 'SET_ORIGINAL_DATA':
      return { ...state, originalData: action.payload };
    case 'SET_AXIS_DATA':
      return {
        ...state,
        xAxis: action.payload.xAxis,
        yAxis: action.payload.yAxis,
      };
    default:
      return state;
  }
}

// Context type
interface NpyViewerContextType {
  state: typeof initialState;
  setTexture: (texture: Texture | null) => void;
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
  setOriginalData: (data: NpyData) => void;
  setAxisData: (xAxis: AxisData | null, yAxis: AxisData | null) => void;
  loadNpyFile: (file: File) => Promise<void>;
  calculateDisplayValues: (screenX: number, screenY: number) => { axisX: number; axisY: number };
}

// Create context
const NpyViewerContext = createContext<NpyViewerContextType | null>(null);

// Provider component
export function NpyViewerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Action creators
  const setTexture = useCallback((texture: Texture | null) => {
    dispatch({ type: 'SET_TEXTURE', payload: texture });
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

  const setOriginalData = useCallback((data: NpyData) => {
    dispatch({ type: 'SET_ORIGINAL_DATA', payload: data });
  }, []);

  const setAxisData = useCallback((xAxis: AxisData | null, yAxis: AxisData | null) => {
    dispatch({ type: 'SET_AXIS_DATA', payload: { xAxis, yAxis } });
  }, []);

  const loadNpyFile = useCallback(async (file: File) => {
    try {
      setError(null);
      setLoading(true);
      setPoints([]);

      const npyjs = new NpyJs();
      const arrayBuffer = await file.arrayBuffer();
      const npyData = await npyjs.load(arrayBuffer);

      let min = Number(npyData.data[0]);
      let max = min;
      for (let i = 1; i < npyData.data.length; i++) {
        const val = Number(npyData.data[i]);
        if (val < min) min = val;
        if (val > max) max = val;
      }

      setOriginalData({
        data: npyData.data,
        shape: npyData.shape,
        min,
        max
      });

      // Additional processing as needed...
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NPY file");
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPoints, setOriginalData]);

  const calculateDisplayValues = useCallback((screenX: number, screenY: number) => {
    const xRatio = (800 - screenX) / 800;
    const axisX = state.axisLimits.xmin + xRatio * (state.axisLimits.xmax - state.axisLimits.xmin);

    const yRatio = (400 - screenY) / 400;
    const axisY = state.axisLimits.ymin + yRatio * (state.axisLimits.ymax - state.axisLimits.ymin);

    return { axisX, axisY };
  }, [state.axisLimits]);

  return (
    <NpyViewerContext.Provider
      value={{
        state,
        setTexture,
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
        setOriginalData,
        setAxisData,
        loadNpyFile,
        calculateDisplayValues,
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