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
