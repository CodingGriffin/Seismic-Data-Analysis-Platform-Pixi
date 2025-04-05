import { FreqSlowManger } from "./FreqSlowManager/FreqSlowManager";
import { GeometryManager } from "./GeometryManager/GeometryManager";
import { RecordManager } from "./RecordManager/RecordManger";

export const DataManger = () => {
  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <div className="col-md-5 border p-3 d-flex mt-2">
          <GeometryManager />
        </div>
        <div className="col-md-2">
        </div>
        <div className="col-md-5 border p-3 d-flex mt-2">
          <RecordManager />
        </div>
      </div>
      <div className="row mt-4">
        <div className="border p-3 col d-flex mt-2">
          <FreqSlowManger />
        </div>
      </div>
    </div>
  );
};