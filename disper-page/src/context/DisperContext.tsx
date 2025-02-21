import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Layer } from '../types';
import VelModel from '../utils/VelModel';

const INITIAL_DATA: Layer[] = [
  { startDepth: 0.0, endDepth: 30.0, velocity: 760.0, density: 2.0, ignore: 0 },
  { startDepth: 30.0, endDepth: 44.0, velocity: 1061.0, density: 2.0, ignore: 0 },
  { startDepth: 44.0, endDepth: 144.0, velocity: 1270.657, density: 2.0, ignore: 0 },
];

interface DisperContextType {
  layers: Layer[];
  setLayers: (layers: Layer[]) => void;
  addLayer: (newLayer: Layer) => void;
  updateLayer: (index: number, updatedLayer: Partial<Layer>) => void;
  removeLayer: (index: number) => void;
  splitLayer: (index: number, depth: number) => void;
  deleteLayer?: (index: number) => void;
  
  calculateVs30: () => number;
  calculateSiteClass: (vs30: number) => string | null;
  
  asceVersion: string;
  setAsceVersion: (version: string) => void;
  
  vs30: number | null;
  setVs30: (value: number | null) => void;
  siteClass: string | null;
  setSiteClass: (value: string | null) => void;
  velModel: VelModel | null;
  phaseVelMin: number;
  phaseVelMax: number;
  setPhaseVelMin: (value: number) => void;
  setPhaseVelMax: (value: number) => void;
  displayUnits: 'm' | 'ft';
  setDisplayUnits: (units: 'm' | 'ft') => void;
  ToMeter: (value: number) => number;
  ToFeet: (value: number) => number;
}

const DisperContext = createContext<DisperContextType | undefined>(undefined);

interface DisperProviderProps {
  children: ReactNode;
}

export function DisperProvider({ children }: DisperProviderProps) {
  const [layers, setLayers] = useState<Layer[]>(INITIAL_DATA);
  const [asceVersion, setAsceVersion] = useState<string>("ASCE 7-22");
  const [vs30, setVs30] = useState<number | null>(null);
  const [siteClass, setSiteClass] = useState<string | null>(null);
  const [velModel, setVelModel] = useState<VelModel | null>(null);
  const [phaseVelMin, setPhaseVelMin] = useState<number>(10);
  const [phaseVelMax, setPhaseVelMax] = useState<number>(2000);
  const [displayUnits, setDisplayUnits] = useState<'m' | 'ft'>('m');

  // Add conversion helpers
  const ToFeet = useCallback((value: number): number => {
    return value * 3.28084;
  }, [displayUnits]);

  const ToMeter = useCallback((value: number): number => {
    return value / 3.28084;
  }, [displayUnits]);

  const addLayer = (newLayer: Layer) => {
    setLayers(prevLayers => [...prevLayers, newLayer]);
  };

  const updateLayer = (index: number, updatedLayer: Partial<Layer>) => {
    setLayers(prevLayers => {
      const newLayers = [...prevLayers];
      newLayers[index] = { ...newLayers[index], ...updatedLayer };
      return newLayers;
    });
  };

  const removeLayer = (index: number) => {
    setLayers(prevLayers => prevLayers.filter((_, i) => i !== index));
  };

  const splitLayer = (index: number, depth: number) => {
    setLayers(prevLayers => {
      const newLayers = [...prevLayers];
      const layer = newLayers[index];
      
      if (depth > layer.startDepth && depth < layer.endDepth) {
        const upperLayer: Layer = {
          startDepth: layer.startDepth,
          endDepth: depth,
          velocity: layer.velocity,
          density: layer.density,
          ignore: layer.ignore
        };

        const lowerLayer: Layer = {
          startDepth: depth,
          endDepth: layer.endDepth,
          velocity: layer.velocity,
          density: layer.density,
          ignore: layer.ignore
        };

        newLayers.splice(index, 1, upperLayer, lowerLayer);
      }
      
      return newLayers;
    });
  };

  const calculateVs30 = () => {
    const num_layers = layers.length;
    const layer_thicknesses = layers.map(
      layer => layer.endDepth - layer.startDepth
    );
    const vels_shear = layers.map(layer => layer.velocity);
    const densities = layers.map(layer => layer.density);
    const vels_compression = vels_shear.map(v => v * Math.sqrt(3));

    const model = new VelModel(
      num_layers,
      layer_thicknesses,
      densities,
      vels_compression,
      vels_shear,
      phaseVelMin,
      phaseVelMax,
      2.0
    );

    setVelModel(model);
    return model.get_vs30();
  };

  const calculateSiteClass = (vs30: number) => {
    const formattedAsceVersion = asceVersion
      .toLowerCase()
      .replace(/[- ]/g, "_");
    
    return VelModel.calc_site_class(formattedAsceVersion, vs30);
  };

  const deleteLayer = useCallback((index: number) => {
    setLayers(prevLayers => {
      if (prevLayers.length <= 1) return prevLayers;
      
      const newLayers = [...prevLayers];
      
      if (index === 0) {
        newLayers[1].startDepth = newLayers[0].startDepth;
        newLayers.splice(0, 1);
      } else if (index === prevLayers.length - 1) {
        newLayers.splice(index, 1);
      } else {
        newLayers[index - 1].endDepth = prevLayers[index].endDepth;
        newLayers.splice(index, 1);
      }
      
      return newLayers;
    });
  }, []);

  const value: DisperContextType = {
    // Layer Management
    layers,
    setLayers,
    addLayer,
    updateLayer,
    removeLayer,
    splitLayer,
    deleteLayer,
    
    // Layer Calculations
    calculateVs30,
    calculateSiteClass,
    
    // ASCE Version
    asceVersion,
    setAsceVersion,
    
    // Results
    vs30,
    setVs30,
    siteClass,
    setSiteClass,
    velModel,
    phaseVelMin,
    phaseVelMax,
    setPhaseVelMin,
    setPhaseVelMax,
    displayUnits,
    setDisplayUnits,
    ToMeter,
    ToFeet,
  };

  return (
    <DisperContext.Provider value={value}>
      {children}
    </DisperContext.Provider>
  );
}

export function useDisper() {
  const context = useContext(DisperContext);
  if (context === undefined) {
    throw new Error('useDisper must be used within a DisperProvider');
  }
  return context;
}
