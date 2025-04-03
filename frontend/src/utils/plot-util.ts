import { getColorFromMap } from "./record-util";
import { Texture } from "pixi.js";
import { Transformation } from "../store/slices/plotSlice";

export const createTexture = (
  transformedData: number[],
  dimensions: { width: number; height: number },
  dataRange: { min: number; max: number },
  colorMap: string[]
) => {
  if (!transformedData || transformedData.length === 0 ||
    dimensions.width <= 0 || dimensions.height <= 0) {
    console.warn("Invalid data or dimensions for texture creation");
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Could not get 2D context for canvas");
      return null;
    }

    const rgba = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    const range = dataRange.max - dataRange.min;

    const normalizer = range === 0 ? 1 : range;

    for (let i = 0; i < transformedData.length && i < (canvas.width * canvas.height); i++) {
      const normalizedValue = (transformedData[i] - dataRange.min) / normalizer;
      const color = getColorFromMap(normalizedValue, colorMap);
      const idx = i * 4;
      rgba[idx] = color.r;
      rgba[idx + 1] = color.g;
      rgba[idx + 2] = color.b;
      rgba[idx + 3] = 255;
    }

    const imgData = new ImageData(rgba, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);

    const texture = Texture.from(canvas);
    canvas.remove();

    if (!texture) {
      console.error("Failed to create valid texture");
      return null;
    }

    return texture;
  } catch (error) {
    console.error("Error in createTexture:", error);
    return null;
  }
};

export const ORIGINAL_COORDINATE_MATRIX = [
  [0, -1, 0],//top, bottom
  [2, 0, 1],//left, right
  [0, -2, 0]//bottom, top
];

/**
 * Transforms a point based on the specified transformation type
 * @param point The point to transform {x, y}
 * @param dimensions The dimensions of the plot {width, height}
 * @param transformationType The type of transformation to apply
 * @returns The transformed point {x, y}
 */
export const transformPoint = (
  point: { x: number; y: number },
  dimensions: { width: number; height: number },
  transformationType: Transformation
): { x: number; y: number } => {
  const { width, height } = dimensions;
  
  switch (transformationType) {
    case "flipHorizontal":
      // Flip horizontally (mirror across vertical axis)
      return { 
        x: width - point.x, 
        y: point.y 
      };
      
    case "flipVertical":
      // Flip vertically (mirror across horizontal axis)
      return { 
        x: point.x, 
        y: height - point.y 
      };
      
    case "rotateClockwise":
      // Rotate 90 degrees clockwise
      return { 
        x: height - point.y, 
        y: point.x 
      };
      
    case "rotateCounterClockwise":
      // Rotate 90 degrees counter-clockwise
      return { 
        x: point.y, 
        y: width - point.x 
      };
      
    default:
      return { ...point };
  }
};

/**
 * Applies a sequence of transformations to a point
 * @param point The original point {x, y}
 * @param dimensions The dimensions of the plot {width, height}
 * @param transformations Array of transformations to apply in sequence
 * @returns The transformed point {x, y}
 */
export const applyPointTransformations = (
  point: { x: number; y: number },
  dimensions: { width: number; height: number },
  transformations: Transformation[]
): { x: number; y: number } => {
  // Start with the original point
  let transformedPoint = { ...point };
  let currentDimensions = { ...dimensions };
  
  // Apply each transformation in sequence
  for (const transformation of transformations) {
    transformedPoint = transformPoint(transformedPoint, currentDimensions, transformation);
    
    // Update dimensions if rotation occurred (width and height swap)
    if (transformation === "rotateClockwise" || transformation === "rotateCounterClockwise") {
      currentDimensions = { 
        width: currentDimensions.height, 
        height: currentDimensions.width 
      };
    }
  }
  
  return transformedPoint;
};

