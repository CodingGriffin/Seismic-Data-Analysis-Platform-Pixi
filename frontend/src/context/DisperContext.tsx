import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import VelModel from '../utils/disper-util';
import { Layer, PickData } from '../types/data';

const INITIAL_DATA: Layer[] = [
    { startDepth: 0.0, endDepth: 30.0, velocity: 760.0, density: 2.0, ignore: 0 },
    { startDepth: 30.0, endDepth: 44.0, velocity: 1061.0, density: 2.0, ignore: 0 },
    { startDepth: 44.0, endDepth: 144.0, velocity: 1270.657, density: 2.0, ignore: 0 },
];

const initialState = {
    layers: INITIAL_DATA,
    asceVersion: "ASCE 7-22",
    vs30: null as number | null,
    siteClass: null as string | null,
    velModel: null,
    phaseVelMin: 10,
    phaseVelMax: 2000,
    displayUnits: 'm' as 'm' | 'ft',
    pickData: [] as PickData[],
    dataLimits: {
        minFrequency: 0.0001,
        maxFrequency: 100,
        minSlowness: 0.0001,
        maxSlowness: 100,
    },
};

// Define the context type
type DisperContextType = {
    state: typeof initialState;
    addLayer: (newLayer: Layer) => void;
    updateLayer: (index: number, updatedLayer: Partial<Layer>) => void;
    removeLayer: (index: number) => void;
    setLayers: (layers: Layer[]) => void;
    setVs30: (value: number | null) => void;
    setSiteClass: (value: string | null) => void;
    setAsceVersion: (version: string) => void;
    setPickData: (data: PickData[]) => void;
    calculateVs30: () => number;
    setDisplayUnits: (units: 'm' | 'ft') => void;
    splitLayer: (index: number, depth: number) => void;
    deleteLayer: (index: number) => void;
    ToFeet: (value: number) => number;
    ToMeter: (value: number) => number;
};

function reducer(state: typeof initialState, action: { type: string; payload: any }) {
    switch (action.type) {
        case 'SET_LAYERS':
            return { ...state, layers: action.payload };
        case 'ADD_LAYER':
            return { ...state, layers: [...state.layers, action.payload] };
        case 'UPDATE_LAYER':
            return {
                ...state,
                layers: state.layers.map((layer, index) =>
                    index === action.payload.index ? { ...layer, ...action.payload.updatedLayer } : layer
                ),
            };
        case 'REMOVE_LAYER':
            return { ...state, layers: state.layers.filter((_, i) => i !== action.payload) };
        case 'SET_VS30':
            return { ...state, vs30: action.payload };
        case 'SET_SITE_CLASS':
            return { ...state, siteClass: action.payload };
        case 'SET_ASCE_VERSION':
            return { ...state, asceVersion: action.payload };
        case 'SET_PICK_DATA':
            return { ...state, pickData: action.payload };
        case 'SET_DISPLAY_UNITS':
            return { ...state, displayUnits: action.payload };
        case 'SET_DATA_LIMITS':
            return { ...state, dataLimits: action.payload };
        default:
            return state;
    }
}

export const DisperContext = createContext<DisperContextType | null>(null);

export function useDisper() {
    const context = useContext(DisperContext);
    if (!context) throw new Error('useDisper must be used within a DisperProvider');
    return context;
}

export function DisperProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    // const reduxDispatch = useDispatch();
    const points = useAppSelector((state: any) => state.plot.points || []);

    const addLayer = useCallback((newLayer: Layer) => {
        dispatch({ type: 'ADD_LAYER', payload: newLayer });
    }, []);

    const updateLayer = useCallback((index: number, updatedLayer: Partial<Layer>) => {
        dispatch({ type: 'UPDATE_LAYER', payload: { index, updatedLayer } });
    }, []);

    const removeLayer = useCallback((index: number) => {
        dispatch({ type: 'REMOVE_LAYER', payload: index });
    }, []);

    const setLayers = useCallback((layers: Layer[]) => {
        dispatch({ type: 'SET_LAYERS', payload: layers });
    }, []);

    const setVs30 = useCallback((value: number | null) => {
        dispatch({ type: 'SET_VS30', payload: value });
    }, []);

    const setSiteClass = useCallback((value: string | null) => {
        dispatch({ type: 'SET_SITE_CLASS', payload: value });
    }, []);

    const setAsceVersion = useCallback((version: string) => {
        dispatch({ type: 'SET_ASCE_VERSION', payload: version });
    }, []);

    const setPickData = useCallback((data: PickData[]) => {
        dispatch({ type: 'SET_PICK_DATA', payload: data });
    }, []);

    const setDisplayUnits = useCallback((units: 'm' | 'ft') => {
        dispatch({ type: 'SET_DISPLAY_UNITS', payload: units });
    }, []);

    const splitLayer = useCallback((index: number, depth: number) => {
        const layer = state.layers[index];
        if (!layer) return;

        const newLayers = [...state.layers];
        const upperLayer = { ...layer, endDepth: depth };
        const lowerLayer = { ...layer, startDepth: depth };

        newLayers.splice(index, 1, upperLayer, lowerLayer);
        dispatch({ type: 'SET_LAYERS', payload: newLayers });
    }, [state.layers]);

    const deleteLayer = useCallback((index: number) => {
        
        const selectedLayer = state.layers[index];
        console.log("Removing Layer:", index, selectedLayer);
        const prevLayers = [...state.layers];
        console.log("Layers:", prevLayers);
        if (prevLayers.length <= 1) {
            return prevLayers;
        }
        
        const newLayers = [...prevLayers];
        
        newLayers.splice(index, 1);
        
        if (index > 0 && index < prevLayers.length - 1) {
            newLayers[index - 1].endDepth = prevLayers[index + 1].startDepth;
        } else if (index === 0 && newLayers.length > 0) {
            newLayers[0].startDepth = 0;
        } else if (index === prevLayers.length - 1 && newLayers.length > 0) {
            newLayers[newLayers.length - 1].endDepth = prevLayers[prevLayers.length - 1].endDepth;
        }
        
        console.log("After removing Layers:", newLayers)
        
        dispatch({ type: 'SET_LAYERS', payload: newLayers });
    }, [state.layers]);

    const ToFeet = useCallback((value: number) => {
        return value * 3.28084; // Convert meters to feet
    }, []);

    const ToMeter = useCallback((value: number) => {
        return value / 3.28084; // Convert feet to meters
    }, []);

    const calculateVs30 = useCallback(() => {
        const num_layers = state.layers.length;
        const layer_thicknesses = state.layers.map((layer: Layer) => layer.endDepth - layer.startDepth);
        const vels_shear = state.layers.map((layer: Layer) => layer.velocity);
        const densities = state.layers.map((layer: Layer) => layer.density);
        const vels_compression = vels_shear.map((v: number) => v * Math.sqrt(3));

        const model = new VelModel(
            num_layers,
            layer_thicknesses,
            densities,
            vels_compression,
            vels_shear,
            state.phaseVelMin,
            state.phaseVelMax,
            2.0
        );

        dispatch({ type: 'SET_VS30', payload: model.get_vs30() });
        return model.get_vs30();
    }, [state.layers, state.phaseVelMin, state.phaseVelMax]);

    useEffect(() => {
        console.log("Pick Data Changed:", state.pickData)
        if (state.pickData.length > 0) {
            const minFrequency = Math.min(...state.pickData.map((data: PickData) => data.frequency));
            const maxFrequency = Math.max(...state.pickData.map((data: PickData) => data.frequency));
            const minSlowness = Math.min(...state.pickData.map((data: PickData) => data.slowness));
            const maxSlowness = Math.max(...state.pickData.map((data: PickData) => data.slowness));

            dispatch({
                type: 'SET_DATA_LIMITS',
                payload: { minFrequency, maxFrequency, minSlowness, maxSlowness },
            });
        }
    }, [state.pickData]);
    
    useEffect(() => {
        console.log("Points from redux:", points)
        if (points && points.length > 0) {
            setPickData(points);
        }
    }, [points]);

    useEffect(() => {
        console.log("Context Layers Changed:", state.layers);
    }, [state.layers])
    return (
        <DisperContext.Provider
            value={{
                state,
                addLayer,
                updateLayer,
                removeLayer,
                setLayers,
                setVs30,
                setSiteClass,
                setAsceVersion,
                setPickData,
                calculateVs30,
                setDisplayUnits,
                splitLayer,
                deleteLayer,
                ToFeet,
                ToMeter
            }}
        >
            {children}
        </DisperContext.Provider>
    );
}
