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
}

export interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }): Promise<FileSystemFileHandle>;
  }