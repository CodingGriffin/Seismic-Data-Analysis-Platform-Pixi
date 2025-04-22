import { DisperCurveManager } from '../../features/DisperCurveManager/DisperCurveManager';
import { DisperModelManager } from '../../features/DisperModelManager/DisperModelManager';
import { DisperProvider } from '../../context/DisperContext';
import UnitsSelector from '../../features/DisperUnitSelector/DisperUnitSelector';
import SectionHeader from '../../components/SectionHeader/SectionHeader';
import DisperSettingsSave from '../../features/DisperSettingsSave/DisperSettingsSave';

export default function DisperPage() {

    return (
        <DisperProvider>
            <div className="container-fluid py-4">
                <div className="row mb-4">
                    <div className="col-12">
                        <SectionHeader title="Dispersion Analysis">
                            <div className='d-flex gap-2'>
                                <UnitsSelector/>
                                <DisperSettingsSave/>
                            </div>
                        </SectionHeader>
                    </div>
                </div>

                <div className="row g-4">
                    <div className="col-lg-6">
                        <DisperCurveManager />
                    </div>
                    <div className="col-lg-6">
                        <DisperModelManager />
                    </div>
                </div>
            </div>
        </DisperProvider>
    );
}


