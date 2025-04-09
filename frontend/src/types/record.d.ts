export interface NpyData {
  data: number[][];
  shape: number[];
  min: number;
  max: number;
}

export type Matrix = number[][];

export interface RecordOption {
  id:string;
  enabled: boolean;
  weight: number;
  fileName: string;
}

export interface RecordUploadFile {
  id:string;
  file: File|null;
}

export interface RecordData {
  data: number[][];
  shape: number[];
  dimensions: { width: number; height: number };
  min: number;
  max: number;
}

export type RGB = { r: number; g: number; b: number };
export type ColorStop = { color: RGB; position: number };