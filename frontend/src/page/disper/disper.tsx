import { DisperCurveManager } from '../../features/DisperCurveManager/DisperCurveManager';
import { DisperModelManager } from '../../features/DisperModelManager/DisperModelManager';
import { DisperProvider } from '../../context/DisperContext';
import UnitsSelector from '../../features/DisperUnitSelector/DisperUnitSelector';
import SectionHeader from '../../components/SectionHeader/SectionHeader';

export default function App() {
    return (
        <DisperProvider>
            <div className="container-fluid py-4">
                <div className="row mb-4">
                    <div className="col-12">
                        <SectionHeader title="Dispersion Analysis" actions={<UnitsSelector />} />
                    </div>
                </div>
                
                <div className="row g-4">
                    <div className="col-lg-6">
                        <div className="card h-100">
                            <SectionHeader title="Dispersion Curve" />
                            <div className="card-body">
                                <DisperCurveManager />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="card h-100">
                            <SectionHeader title="Velocity Model" />
                            <div className="card-body">
                                <DisperModelManager />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DisperProvider>
    );
}


