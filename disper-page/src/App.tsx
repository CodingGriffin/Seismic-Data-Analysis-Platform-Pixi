import { LeftPlot } from './components/LeftPlot/LeftPlot';
import { RightPlot } from './components/RightPlot/RightPlot';
import { DisperProvider } from './context/DisperContext';
import UnitsSelector from './components/UnitsSelector/UnitsSelector';

export default function App() {
    return (
        <DisperProvider>
            <div className="container mx-auto min-h-screen bg-gray-100 p-4">
                <div className="flex justify-end mb-4">
                    <UnitsSelector />
                </div>
                
                <div className="flex flex-col lg:flex-row justify-center gap-8">
                    <div className="w-full lg:w-[600px]">
                        <div className="text-center mb-4 text-lg font-semibold">Curve</div>
                        <LeftPlot />
                    </div>
                    <div className="w-full lg:w-[600px]">
                        <div className="text-center mb-4 text-lg font-semibold">Model</div>
                        <RightPlot />
                    </div>
                </div>
            </div>
        </DisperProvider>
    );
}
