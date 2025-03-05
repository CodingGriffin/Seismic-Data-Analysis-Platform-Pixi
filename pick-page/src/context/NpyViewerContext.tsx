import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import NpyJs from 'npyjs';

// Types
interface Point {
  x: number;
  y: number;
  
 
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

export const COLOR_MAPS = {
  'RdYlBu': [
    'rgb(165,0,38)',
    'rgb(215,48,39)',
    'rgb(244,109,67)',
    'rgb(253,174,97)',
    'rgb(254,224,144)',
    'rgb(255,255,191)',
    'rgb(224,243,248)',
    'rgb(171,217,233)',
    'rgb(116,173,209)',
    'rgb(69,117,180)',
    'rgb(49,54,149)'
  ],
  'Spectral': [
    'rgb(158,1,66)',
    'rgb(213,62,79)',
    'rgb(244,109,67)',
    'rgb(253,174,97)',
    'rgb(254,224,139)',
    'rgb(255,255,191)',
    'rgb(230,245,152)',
    'rgb(171,221,164)',
    'rgb(102,194,165)',
    'rgb(50,136,189)',
    'rgb(94,79,162)'
  ],
  'PuOr': [
    'rgb(127,59,8)',
    'rgb(179,88,6)',
    'rgb(224,130,20)',
    'rgb(253,184,99)',
    'rgb(254,224,182)',
    'rgb(247,247,247)',
    'rgb(216,218,235)',
    'rgb(178,171,210)',
    'rgb(128,115,172)',
    'rgb(84,39,136)',
    'rgb(45,0,75)'
  ],
  'RdGy': [
    'rgb(103,0,31)',
    'rgb(178,24,43)',
    'rgb(214,96,77)',
    'rgb(244,165,130)',
    'rgb(253,219,199)',
    'rgb(255,255,255)',
    'rgb(224,224,224)',
    'rgb(186,186,186)',
    'rgb(135,135,135)',
    'rgb(77,77,77)',
    'rgb(26,26,26)'
  ]
} as const;

export type ColorMapKey = keyof typeof COLOR_MAPS;

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

interface TextureData {
  transformed: Float32Array;
  dimensions: { width: number; height: number };
}
// Parse RGB string to RGB object
const parseRGB = (rgbStr: string): RGB => {
  const matches = rgbStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!matches) throw new Error('Invalid RGB string');
  return {
    r: parseInt(matches[1]),
    g: parseInt(matches[2]),
    b: parseInt(matches[3])
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

// Get color for a normalized value using the color map
export const getColorFromMap = (normalizedValue: number, colorMap: string[]): RGB => {
  const rgbColors = colorMap.map(parseRGB);
  const segments = rgbColors.length - 1;
  const segment = Math.min(Math.floor(normalizedValue * segments), segments - 1);
  const segmentRatio = (normalizedValue * segments) - segment;
  // console.log("segments:", segments)
  // console.log("segment:", segment)
  // console.log("segmentRatio:", segmentRatio)

  return interpolateRGB(rgbColors[segment], rgbColors[segment + 1], segmentRatio);
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
  frequencyData: null as NpyData | null,
  slownessData: null as NpyData | null,
  xAxis: null as AxisData | null,
  yAxis: null as AxisData | null,
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
  | { type: 'SET_ORIGINAL_DATA'; payload: NpyData }
  | { type: 'SET_ORIGINAL_DATA'; payload: NpyData }
  | { type: 'SET_FREQUENCY_DATA'; payload: NpyData }
  | { type: 'SET_SLOWNESS_DATA'; payload: NpyData }
  | { type: 'SET_AXIS_DATA'; payload: { xAxis: AxisData | null; yAxis: AxisData | null } };

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
    case 'SET_FREQUENCY_DATA':
      return { ...state, frequencyData: action.payload };
    case 'SET_SLOWNESS_DATA':
      return { ...state, slownessData: action.payload };
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
  setOriginalData: (data: NpyData) => void;
  setAxisData: (xAxis: AxisData | null, yAxis: AxisData | null) => void;
  loadNpyFile: (file: File, dataType:'frequency'|'slowness'|'data') => Promise<void>;
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

  const setOriginalData = useCallback((data: NpyData) => {
    dispatch({ type: 'SET_ORIGINAL_DATA', payload: data });
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

  const loadNpyFile = useCallback(async (file: File, dataType:'frequency'|'slowness'|'data') => {
    try {
      setError(null);
      
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

      switch (dataType) {
        case 'frequency':
          setFrequencyData({
            data: npyData.data,
            shape: npyData.shape,
            min,
            max
          });
          break;
        case 'slowness':
          setSlownessData({
            data: npyData.data,
            shape: npyData.shape,
            min,
            max
          });
          break;
        case 'data':
          setOriginalData({
            data: npyData.data,
            shape: npyData.shape,
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
  }, [setError, setLoading, setPoints, setOriginalData]);

  const processImageData = useCallback((originalData: NpyData, imageTransform: ImageTransform) => {
    const { data, shape } = originalData;
    const [height, width] = shape;
    const transformed = new Float32Array(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let dstX = x;
        let dstY = y;

        // Apply counter-clockwise rotation (90° CCW)
        if (imageTransform.rotationCounterClockwise) {
          [dstX, dstY] = [dstY, width - 1 - dstX];
        }

        // Apply clockwise rotation (90° CW)
        if (imageTransform.rotationClockwise) {
          [dstX, dstY] = [height - 1 - dstY, dstX];
        }

        // Apply flips after rotations
        const isRotated = imageTransform.rotationCounterClockwise || imageTransform.rotationClockwise;
        const currentWidth = isRotated ? height : width;
        const currentHeight = isRotated ? width : height;

        if (imageTransform.flipHorizontal) {
          dstX = currentWidth - 1 - dstX;
        }
        if (imageTransform.flipVertical) {
          dstY = currentHeight - 1 - dstY;
        }

        const srcIndex = y * width + x;
        const dstIndex = dstY * (isRotated ? height : width) + dstX;
        transformed[dstIndex] = Number(data[srcIndex]);
      }
    }

    return {
      transformed,
      dimensions: {
        width: imageTransform.rotationCounterClockwise || imageTransform.rotationClockwise ? height : width,
        height: imageTransform.rotationCounterClockwise || imageTransform.rotationClockwise ? width : height
      }
    };
  }, []);

  const applyTransformations = useCallback(async () => {
    if (!state.originalData) return;
    
    setLoading(true);
    try {
      // Process the image data in the next frame to allow loading state to render
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      console.log("Processing Image...");
      
      // Process the image data
      const { transformed, dimensions } = processImageData(state.originalData, state.imageTransform);
      
      setTextureData({transformed, dimensions});
      
    } catch (error) {
      console.error("Error processing image:", error);
      setError(error instanceof Error ? error.message : "Failed to process image");
    } finally {
      setLoading(false);
    }
  }, [state.imageTransform, state.originalData, setTextureData, setError, setLoading]);

  useEffect(() => {
    console.log("Original Data:", state.originalData);
    
    if (state.originalData) {
      applyTransformations();
    }
  }, [state.imageTransform, state.originalData, state.selectedColorMap, applyTransformations]);

  useEffect(() => {
    console.log("Frequency Data:", state.frequencyData, "Slowness Data:", state.slownessData);
  }, [state.frequencyData, state.slownessData]);

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
        setOriginalData,
        setAxisData,
        loadNpyFile,
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
