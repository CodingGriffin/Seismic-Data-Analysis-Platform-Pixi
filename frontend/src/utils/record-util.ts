import { Texture } from "pixi.js";
import { RGB, ColorStop } from "../types/record";
import { RecordItem } from "../types/record";

export type ColorMapKey = string;
export const parseColorStop = (colorStop: string): ColorStop => {
  const match = colorStop.match(
    /rgb\((\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*),\s*([\d.]+)\)/
  );
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
    b: Math.round(color1.b + (color2.b - color1.b) * ratio),
  };
};

// Get color for a normalized value using a non-uniform color map
export const getColorFromMap = (
  normalizedValue: number,
  colorMap: string[]
): RGB => {
  const colorStops = colorMap.map(parseColorStop);

  // Find the two surrounding colors for interpolation
  for (let i = 0; i < colorStops.length - 1; i++) {
    const start = colorStops[i];
    const end = colorStops[i + 1];

    if (normalizedValue >= start.position && normalizedValue <= end.position) {
      // Calculate the interpolation ratio within this segment
      const segmentRatio =
        (normalizedValue - start.position) / (end.position - start.position);
      return interpolateRGB(start.color, end.color, segmentRatio);
    }
  }

  // If the value is out of range, return the closest boundary color
  return normalizedValue <= colorStops[0].position
    ? colorStops[0].color
    : colorStops[colorStops.length - 1].color;
};

export interface ColorMap {
  name: ColorMapKey;
  stops: string[];
}

export const drawRecordItem = (recordItem: RecordItem, colorMap: string[]) => {
  const { data, dimensions, min: min, max: max } = recordItem;
  const transformedData = data.flat();
  const dataRange = { min, max };
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d")!;

  const rgba = new Uint8ClampedArray(canvas.width * canvas.height * 4);

  for (let i = 0; i < transformedData.length; i++) {
    const normalizedValue =
      (transformedData[i] - dataRange.min) / (dataRange.max - dataRange.min);
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
  return texture;
};
