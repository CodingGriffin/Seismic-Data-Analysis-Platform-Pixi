export interface GeometryItem {
  index: number,
  x: number,
  y: number,
  z: number,
}

export interface GeometryArray {
  units: string,
  data: GeometryItem[]
}
