import { FreqSlowManger } from "./FreqSlowManager/FreqSlowManager";
import { GeometryManager } from "./GeometryManager/GeometryManager";
import RecordManager from "./RecordManager/RecordManger";
import { Button } from "../../components/Button/Button";
import { useState, useEffect } from "react";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { useAppSelector } from "../../hooks/useAppSelector";
import { setGeometry } from "../../store/slices/geometrySlice";
import { setNumFreq, updateMaxFreq } from "../../store/slices/freqSlice";
import { setNumSlow, updateMaxSlow } from "../../store/slices/slowSlice";
import { setOptions } from "../../store/slices/recordSlice";
import { addToast } from "../../store/slices/toastSlice";
import { GeometryItem } from "../../types/geometry";
import { RecordOption, RecordUploadFile } from "../../types/record";
import {
  selectOptions,
} from "../../store/selectors/recordSelectors";
import { Modal } from "../../components/Modal/Modal";

export const DataManager = () => {
  const dispatch = useAppDispatch();
  const [showDataManager, setShowDataManager] = useState<boolean>(false);

  const geometry = useAppSelector((state) => state.geometry.items);
  const { numFreq, maxFreq } = useAppSelector((state) => state.freq);
  const { numSlow, maxSlow } = useAppSelector((state) => state.slow);
  const recordOptions = useAppSelector(selectOptions);

  const [savedGeometry, setSavedGeometry] = useState<GeometryItem[]>([]);
  const [savedFreqSettings, setSavedFreqSettings] = useState({ numFreq: 0, maxFreq: 0 });
  const [savedSlowSettings, setSavedSlowSettings] = useState({ numSlow: 0, maxSlow: 0 });
  const [savedRecordOptions, setSavedRecordOptions] = useState<RecordOption[]>([]);
  const [uploadFiles, setUploadFiles] = useState<{[key:string]:File|null}>({});

  const [originalState, setOriginalState] = useState({
    geometry: [] as GeometryItem[],
    freqSettings: { numFreq: 0, maxFreq: 0 },
    slowSettings: { numSlow: 0, maxSlow: 0 },
    recordOptions: [] as RecordOption[],
  });

  const handleUploadFiles = (files: RecordUploadFile[]|null) => {
    let newUploadFiles:{[key:string]:File|null} = {...uploadFiles};
    if (files === null) {
      setUploadFiles({});
      return;
    } else if (files.length === 1 && files[0].file === null) {
      delete newUploadFiles[files[0].id];
    } else {
      files.forEach((uploadFile) => newUploadFiles[uploadFile.id] = uploadFile.file)
    }
    setUploadFiles(newUploadFiles);
  }

  const handleApplyChanges = () => {
    dispatch(setGeometry(savedGeometry));

    dispatch(setNumFreq(savedFreqSettings.numFreq));
    dispatch(updateMaxFreq(savedFreqSettings.maxFreq));

    dispatch(setNumSlow(savedSlowSettings.numSlow));
    dispatch(updateMaxSlow(savedSlowSettings.maxSlow));

    dispatch(setOptions(savedRecordOptions));
    setUploadFiles({});

    dispatch(addToast({
      message: "Changes applied successfully",
      type: "success",
      duration: 3000
    }));

    setShowDataManager(false);
  };

  const handleDiscardChanges = () => {
    setSavedGeometry(originalState.geometry);
    setSavedFreqSettings(originalState.freqSettings);
    setSavedSlowSettings(originalState.slowSettings);
    setSavedRecordOptions(originalState.recordOptions);
    setUploadFiles({});

    dispatch(addToast({
      message: "Changes discarded",
      type: "info",
      duration: 3000
    }));

    setShowDataManager(false);
  };

  useEffect(() => {
    if (showDataManager) {
      setOriginalState({
        geometry: [...geometry],
        freqSettings: { numFreq, maxFreq },
        slowSettings: { numSlow, maxSlow },
        recordOptions: [...recordOptions],
      });
    }
  }, [showDataManager, geometry, numFreq, maxFreq, numSlow, maxSlow, recordOptions]);

  useEffect(() => {
    console.log("Local Geometry Changed:", savedGeometry);
  }, [savedGeometry])

  useEffect(() => {
    console.log("Global Geometry Changed:", geometry);
  }, [geometry])

  useEffect(() => {
    console.log("Uploaded Files:", uploadFiles)
  }, [uploadFiles])

  return (
    <>
      <div className="d-flex flex-column border rounded">
        <SectionHeader
          title="Controls"
        />
        <div className="d-flex justify-content-between flex-column gap-3 pt-1" style={{ height: "210px", margin: "8px" }}>
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

      <Modal
        isOpen={showDataManager}
        onClose={handleDiscardChanges}
        className="modal-lg"
      >
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
            <div className="container p-3">
              <div className="row mt-3 gy-5">
                <div className="col border m-3 p-3">
                  <GeometryManager
                    geometry={savedGeometry}
                    onGeometryChange={(geometry) => setSavedGeometry(geometry)}
                  />
                </div>
                <div className="col border m-3 p-3">
                  <RecordManager
                    onUploadFiles={(files) =>handleUploadFiles(files)}
                    onFilesChange={(data) => setUploadFiles(data)}
                    recordOptions={savedRecordOptions}
                    recordUploadFiles={uploadFiles}
                    onRecordOptionsChange={(recordOptions) => setSavedRecordOptions(recordOptions)}
                  />
                </div>
              </div>
              <div className="row">
                <div className="col border m-3">
                  <FreqSlowManger
                    numFreq={savedFreqSettings.numFreq}
                    maxFreq={savedFreqSettings.maxFreq}
                    numSlow={savedSlowSettings.numSlow}
                    maxSlow={savedSlowSettings.maxSlow}
                    onNumFreqChange={(value) => setSavedFreqSettings({ ...savedFreqSettings, numFreq: value })}
                    onMaxFreqChange={(value) => setSavedFreqSettings({ ...savedFreqSettings, maxFreq: value })}
                    onNumSlowChange={(value) => setSavedSlowSettings({ ...savedSlowSettings, numSlow: value })}
                    onMaxSlowChange={(value) => setSavedSlowSettings({ ...savedSlowSettings, maxSlow: value })}
                  />
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
      </Modal>
    </>
  );
};
