import { LeftPlot } from './components/LeftPlot';
import { RightPlot } from './components/RightPlot';
import { Layer } from './types';
import { useState } from 'react';
export default function App() {

    const [updatedLayers, setUpdatedLayers] = useState<Layer[]>([]);
    const [rightAxisLimits, setRightAxisLimits] = useState({xmin: null, xmax: null});
    const handleLayerChange = (layers: Layer[]) => {
        // console.log("Changed:",layers);
        setUpdatedLayers(layers);
    }
    const handleAxisLimitsChange = (axisLimits: any) => {
        setRightAxisLimits(axisLimits);
    }
    
    return (
        <div className="container mx-auto min-h-screen bg-gray-100 p-4">
            <div className="flex flex-col lg:flex-row justify-center gap-8">
                <div className="w-full lg:w-[600px]">
                    <div className="text-center mb-4 text-lg font-semibold">Curve</div>
                    <LeftPlot updatedLayers={updatedLayers} phase_vel_min={rightAxisLimits?.xmin} phase_vel_max={rightAxisLimits?.xmax}
                    />
                </div>
                <div className="w-full lg:w-[600px]">
                    <div className="text-center mb-4 text-lg font-semibold">Model</div>
                    <RightPlot handleLayerChange={handleLayerChange} handleAxisLimitsChange={handleAxisLimitsChange}/>
                </div>
            </div>
        </div>
    );
}
