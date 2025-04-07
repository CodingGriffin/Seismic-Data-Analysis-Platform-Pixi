import { FreqSlowManger } from "./FreqSlowManager/FreqSlowManager";
import { GeometryManager } from "./GeometryManager/GeometryManager";
import { RecordManager } from "./RecordManager/RecordManger";
import { Button } from "../../components/Button/Button";
import { useState, useEffect } from "react";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { useAppSelector } from "../../hooks/useAppSelector";
import { setGeometry } from "../../store/slices/geometrySlice";
import { setNumFreq, updateMaxFreq } from "../../store/slices/freqSlice";
import { setNumSlow, updateMaxSlow } from "../../store/slices/slowSlice";
import { setDataMap, setOrderedIds, setStateMap } from "../../store/slices/recordSlice";
import { addToast } from "../../store/slices/toastSlice";
import { GeometryItem } from "../../types/geometry";

export const DataManager = () => {
  const dispatch = useAppDispatch();
  const [showDataManager, setShowDataManager] = useState<boolean>(false);
  
  const geometry = useAppSelector((state) => state.geometry.items);
  const { numFreq, maxFreq } = useAppSelector((state) => state.freq);
  const { numSlow, maxSlow } = useAppSelector((state) => state.slow);
  const { dataMap, stateMap, orderedIds } = useAppSelector((state) => state.record);
  
  const [savedGeometry, setSavedGeometry] = useState<GeometryItem[]>([]);
  const [savedFreqSettings, setSavedFreqSettings] = useState({ numFreq: 0, maxFreq: 0 });
  const [savedSlowSettings, setSavedSlowSettings] = useState({ numSlow: 0, maxSlow: 0 });
  const [savedRecords, setSavedRecords] = useState({
    dataMap: {},
    stateMap: {},
    orderedIds: [] as string[]
  });
  
  useEffect(() => {
    if (showDataManager) {
      setSavedGeometry([...geometry]);
      setSavedFreqSettings({ numFreq, maxFreq });
      setSavedSlowSettings({ numSlow, maxSlow });
      setSavedRecords({
        dataMap: { ...dataMap },
        stateMap: { ...stateMap },
        orderedIds: [...orderedIds]
      });
    }
  }, [showDataManager]);
  
  const handleApplyChanges = () => {
    dispatch(addToast({
      message: "Changes applied successfully",
      type: "success",
      duration: 3000
    }));
    setShowDataManager(false);
  };
  
  const handleDiscardChanges = () => {
    dispatch(setGeometry(savedGeometry));
    
    dispatch(setNumFreq(savedFreqSettings.numFreq));
    dispatch(updateMaxFreq(savedFreqSettings.maxFreq));
    
    dispatch(setNumSlow(savedSlowSettings.numSlow));
    dispatch(updateMaxSlow(savedSlowSettings.maxSlow));
    dispatch(setDataMap(savedRecords.dataMap));
    dispatch(setStateMap(savedRecords.stateMap));
    dispatch(setOrderedIds(savedRecords.orderedIds));
    
    dispatch(addToast({
      message: "Changes discarded",
      type: "info",
      duration: 3000
    }));
    
    setShowDataManager(false);
  };
  
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
                    onClick={handleDiscardChanges}
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
                <div className="modal-footer">
                  <Button
                    variant="primary"
                    onClick={handleApplyChanges}
                  >
                    Apply
                  </Button>
                  <Button 
                    variant="danger"
                    onClick={handleDiscardChanges}
                  >
                    Discard All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
