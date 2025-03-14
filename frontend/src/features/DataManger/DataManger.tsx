import { GeometryManager } from "./GeometryManager/GeometryManager";
import { RecordManager } from "./RecordManager/RecordManger";

export const DataManger = () => {
  return (
    <div className="container mt-5" >
        <div className="d-flex justify-content-center gap-3">
            <div className="border p-3 col-6 d-flex">
                <GeometryManager />
            </div>
            <div className="border p-3 col-6 d-flex">
                <RecordManager />
            </div>
        </div>
    </div>
  );
};
