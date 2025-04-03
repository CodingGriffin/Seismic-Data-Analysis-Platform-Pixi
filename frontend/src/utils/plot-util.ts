import { getColorFromMap } from "./record-util";
import { Texture } from "pixi.js";

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
