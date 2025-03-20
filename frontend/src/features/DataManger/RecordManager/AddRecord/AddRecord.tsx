import { useEffect, type ChangeEvent } from "react";
import { FileControls } from "../../../../components/FileControls/FileControls";
import { RecordItem } from "../../../../types/record";
import { useAppDispatch } from "../../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../../hooks/useAppSelector";
import { processGridsForPreview, processSingleGridForPreview } from "../../../../store/thunks/cacheThunks";
import { clearCache } from "../../../../store/slices/cacheSlice";
import { setFreqData } from "../../../../store/slices/freqSlice";
import { setSlowData } from "../../../../store/slices/slowSlice";

interface AddRecordProps {
  selectedRecordId?: string;
  mode?: "add" | "edit";
  onAddRecord: (id: string | null, data: RecordItem[] | RecordItem) => void;
  onClose: () => void;
}

export default function AddRecord({
  selectedRecordId,
  mode = "add",
  onAddRecord,
  onClose,
}: AddRecordProps) {
  const dispatch = useAppDispatch();
  
  const geometry = useAppSelector((state) => state.geometry.items);
  const { numFreq, maxFreq } = useAppSelector((state) => state.freq);
  const { numSlow, maxSlow } = useAppSelector((state) => state.slow);
  const { previewRecords, previewFreqData, previewSlowData, isLoading } = useAppSelector((state) => state.cache);

  useEffect(() => {
    return () => {
      dispatch(clearCache());
    };
  }, [dispatch]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const geometryData = JSON.stringify(geometry);
    
    if (mode === "edit" && files.length === 1) {
      dispatch(processSingleGridForPreview({
        sgyFile: files[0],
        geometryData,
        maxSlowness: maxSlow,
        maxFrequency: maxFreq,
        numSlowPoints: numSlow,
        numFreqPoints: numFreq
      }));
    } else {
      dispatch(processGridsForPreview({
        sgyFiles: Array.from(files),
        geometryData,
        maxSlowness: maxSlow,
        maxFrequency: maxFreq,
        numSlowPoints: numSlow,
        numFreqPoints: numFreq
      }));
    }
  };

  const handleConfirm = () => {
    if (previewRecords.length > 0) {
      if (previewFreqData.length > 0) {
        dispatch(setFreqData(previewFreqData));
      }
      
      if (previewSlowData.length > 0) {
        dispatch(setSlowData(previewSlowData));
      }
      
      if (mode === "edit" && selectedRecordId) {
        onAddRecord(selectedRecordId, previewRecords[0]!);
      } else {
        onAddRecord(null, previewRecords);
      }
      
      dispatch(clearCache());
    }
  };

  const isEditMode = mode === "edit";
  const title = isEditMode ? "Edit Record" : "Add Record";
  const buttonText = isEditMode ? "Replace Data" : "Load Data";

  return (
    <div className="modal show d-block" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fs-4">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <FileControls
              onFileSelect={handleFileUpload}
              accept=".sgy"
              showDownload={false}
              multiple={mode === "add" ? true : false}
            />
            <>
              {previewRecords.length > 0 && (
                <div className="border rounded p-3 mb-3 overflow-auto" style={{ maxHeight: "200px" }}>
                  <h6 className="mb-3">Preview Information:</h6>
                  {previewRecords.map((data, index) => (
                    <div key={`${data.fileName}-${index}`} className="card mb-2 p-2">
                      <div className="d-flex justify-content-between">
                        <strong>{data.fileName}</strong>
                        <span className="badge bg-primary">{index + 1}/{previewRecords.length}</span>
                      </div>
                      <div className="small text-muted">
                        <div>Dimensions: {data.dimensions.width} × {data.dimensions.height}</div>
                        <div>Data Range: {data.min.toFixed(4)} to {data.max.toFixed(4)}</div>
                        <div>Shape: [{data.shape.join(', ')}]</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
            <div>{isLoading && <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>}</div>
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-primary w-100"
              disabled={previewRecords.length === 0 || isLoading}
              onClick={handleConfirm}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
