import { Texture } from "pixi.js";
import { RGB, ColorStop } from "../types/record";
import { RecordItem } from "../types/record";

export const COLOR_MAPS = {
  "VsSurf-1": [
    "rgb(255,255,255, 0.0)",
    "rgb(123,122,230, 0.0784313725)",
    "rgb(102,45,248, 0.137254908)",
    "rgb(99,151,255, 0.1960784314)",
    "rgb(7,90,255, 0.2549019608)",
    "rgb(0,247,255, 0.3921568627)",
    "rgb(10,245,88, 0.5098039216)",
    "rgb(76,204,90, 0.5882352941)",
    "rgb(154,208,48, 0.6470588235)",
    "rgb(168,250,5, 0.7058823529)",
    "rgb(254,247,0, 0.7843137255)",
    "rgb(255,156,0, 0.8431372549)",
    "rgb(255,105,0, 0.9215686275)",
    "rgb(255,0,0, 0.9960784314)",
    "rgb(165,0,38, 1.0)",
  ],
  "VsSurf-2": [
    "rgb(49,54,149, 0.0)",
    "rgb(69,117,180, 0.0039215686)",
    "rgb(116,173,209, 0.1254901961)",
    "rgb(171,217,233, 0.2509803922)",
    "rgb(224,243,248, 0.3764705882)",
    "rgb(255,255,191, 0.5019607843)",
    "rgb(254,224,144, 0.6274509804)",
    "rgb(253,174,97, 0.7490196078)",
    "rgb(244,109,67, 0.8745098039)",
    "rgb(215,48,39, 0.99960784314)",
    "rgb(165,0,38, 1.0)",
  ],
  RdYlBu: [
    "rgb(165,0,38, 0.0)",
    "rgb(215,48,39, 0.2)",
    "rgb(253,174,97, 0.5)",
    "rgb(224,243,248, 0.8)",
    "rgb(171,217,233, 0.9)",
    "rgb(49,54,149, 1.0)",
  ],
  Spectral: [
    "rgb(158,1,66, 0.0)",
    "rgb(213,62,79, 0.1)",
    "rgb(244,109,67,0.2)",
    "rgb(253,174,97,0.3)",
    "rgb(254,224,139,0.4)",
    "rgb(255,255,191, 0.5)",
    "rgb(230,245,152, 0.6)",
    "rgb(171,221,164, 0.7)",
    "rgb(102,194,165, 0.8)",
    "rgb(50,136,189, 0.9)",
    "rgb(94,79,162, 1.0)",
  ],
  PuOr: [
    "rgb(127,59,8, 0.0)",
    "rgb(179,88,6, 0.1)",
    "rgb(224,130,20, 0.2)",
    "rgb(253,184,99, 0.3)",
    "rgb(254,224,182, 0.4)",
    "rgb(247,247,247, 0.5)",
    "rgb(216,218,235, 0.6)",
    "rgb(178,171,210, 0.7)",
    "rgb(128,115,172, 0.8)",
    "rgb(84,39,136, 0.9)",
    "rgb(45,0,75, 1.0)",
  ],
  RdGy: [
    "rgb(103,0,31, 0.0)",
    "rgb(178,24,43, 0.1)",
    "rgb(214,96,77, 0.2)",
    "rgb(244,165,130, 0.3)",
    "rgb(253,219,199, 0.4)",
    "rgb(255,255,255, 0.5)",
    "rgb(224,224,224, 0.6)",
    "rgb(186,186,186, 0.7)",
    "rgb(135,135,135, 0.8)",
    "rgb(77,77,77, 0.9)",
    "rgb(26,26,26, 1.0)",
  ],
} as const;

export type ColorMapKey = keyof typeof COLOR_MAPS;
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
