import { FreqSlowManger } from "./FreqSlowManager/FreqSlowManager";
import { GeometryManager } from "./GeometryManager/GeometryManager";
import { RecordManager } from "./RecordManager/RecordManger";
import { Button } from "../../components/Button/Button";
import { useState } from "react";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
export const DataManager = () => {
  const [showDataManager, setShowDataManager] = useState<boolean>(false);
  return (
    <>
      <div className="d-flex flex-column border rounded">
        <SectionHeader
          title="Controls"
        />
        <div className="d-flex justif-content-space-between flex-column gap-3 pt-1" style={{ height: "210px", margin: "8px" }}>
          <Button
            variant="primary"
            onClick={() => setShowDataManager(true)}
            className="w-100"
          >
            Manage Data
          </Button>
          <Button variant="primary" className="w-100">Update Plots</Button>
          <Button variant="primary" className="w-100">Download</Button>
        </div>
      </div>
      {showDataManager && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal show d-block">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Manage Data</h5>
                  <Button
                    variant="secondary"
                    className="btn-close"
                    onClick={() => setShowDataManager(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
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
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};