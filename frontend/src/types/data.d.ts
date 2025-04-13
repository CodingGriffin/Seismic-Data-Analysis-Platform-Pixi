export interface LayerData {
  depth: number;
  density: number;
  ignore: number;
  velocity: number;
  description: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  startDepth: number;
  endDepth: number;
  velocity: number;
  density: number;
  ignore: number;
}

export interface PickData {
  d1: number;
  d2: number;
  frequency: number;
  d3: number;
  slowness: number;
  d4: number;
  d5: number;
}
