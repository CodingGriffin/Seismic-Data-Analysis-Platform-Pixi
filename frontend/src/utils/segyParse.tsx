interface TraceData {
  gx: number;
  gy: number;
  gelev: number;
  scalco?: number;
  scalel?: number;
}

interface SegyData {
  traces: TraceData[];
}

const SEGY_HEADERS = {
  COORDINATE_SCALAR: { pos: 70, type: 'int16' },
  ELEVATION_SCALAR: { pos: 68, type: 'int16' },
  GROUP_X: { pos: 80, type: 'int32' },
  GROUP_Y: { pos: 84, type: 'int32' },
  RECEIVER_GROUP_ELEVATION: { pos: 40, type: 'int32' }
};

const readTraceHeader = (view: DataView, skip: number, pos: number, type: string): number => {
  switch (type) {
    case 'int16':
      return view.getInt16(skip + pos, false);
    case 'int32':
      return view.getInt32(skip + pos, false);
    default:
      throw new Error(`Unsupported header type: ${type}`);
  }
};

const parseTraceHeaders = (view: DataView, skip: number): Record<string, number> => {
  const headers: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(SEGY_HEADERS)) {
    try {
      headers[key] = readTraceHeader(view, skip, value.pos, value.type);
    } catch (error) {
      console.error(`Error reading header ${key}:`, error);
    }
  }
  return headers;
};

const bufToJSON = (arrayBuffer: ArrayBuffer, startOffset: number = 0): SegyData => {
  const view = new DataView(arrayBuffer, startOffset);
  
  const ns = view.getUint16(114, false);
  const trclen = 240 + ns * 4;
  const ntrc = (arrayBuffer.byteLength - startOffset) / trclen;

  if (ntrc !== Math.floor(ntrc)) {
    console.error('Invalid trace count - file may be corrupted');
    return { traces: [] };
  }

  const traces: TraceData[] = [];

  for (let i = 0; i < ntrc; i++) {
    const skip = i * trclen;
    const headers = parseTraceHeaders(view, skip);

    traces.push({
      gx: headers['GROUP_X'],
      gy: headers['GROUP_Y'],
      gelev: headers['RECEIVER_GROUP_ELEVATION'],
      scalco: headers['COORDINATE_SCALAR'],
      scalel: headers['ELEVATION_SCALAR']
    });
  }

  return { traces };
};

export const parseSegy = (arrayBuffer: ArrayBuffer): SegyData => {
  return bufToJSON(arrayBuffer, 3600);
};

export const parseSU = (arrayBuffer: ArrayBuffer): SegyData => {
  return bufToJSON(arrayBuffer);
};

interface GeometryPoint {
  index: number;
  x: number;
  y: number;
  z: number;
}

export const extractGeometryFromSegy = (arrayBuffer: ArrayBuffer): GeometryPoint[] => {
  const segyData = parseSegy(arrayBuffer);
  const geometry: GeometryPoint[] = [];

  segyData.traces.forEach((trace, idx) => {
    const sourceGroupScalar = trace.scalco || 1;
    const scalarMultiplier = sourceGroupScalar === 0 ? 1 : 
                            sourceGroupScalar > 0 ? sourceGroupScalar : 
                            1 / Math.abs(sourceGroupScalar);

    const elevationScalar = trace.scalel || 1;
    const elevationMultiplier = elevationScalar === 0 ? 1 :
                               elevationScalar > 0 ? elevationScalar :
                               1 / Math.abs(elevationScalar);

    const x = trace.gx * scalarMultiplier;
    const y = trace.gy * scalarMultiplier;
    const z = (trace.gelev || 0) * elevationMultiplier;

    geometry.push({
      index: idx,
      x: x,
      y: y,
      z: z
    });
  });

  return geometry;
};
