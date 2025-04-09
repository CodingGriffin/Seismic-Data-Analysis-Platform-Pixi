import React, { useState, useEffect, ChangeEvent } from "react";
import { RecordOption, RecordUploadFile } from "../../../../types/record";
import { Button } from "../../../../components/Button/Button";
import { generateRecordId } from "../../../../utils/record-util";
import { FileControls } from "../../../../components/FileControls/FileControls";

interface AddRecordOptionsProps {
  selectedRecord?: RecordOption;
  mode: "add" | "edit";
  onUploadFiles:(files:RecordUploadFile[]) => void;
  onAddRecordOptions: (data: RecordOption[]) => void;
  onClose: () => void;
}

const AddRecordOptions: React.FC<AddRecordOptionsProps> = ({
  selectedRecord,
  mode,
  onAddRecordOptions,
  onUploadFiles,
  onClose,
}) => {

  const [previewData, setPreviewData] = useState<RecordOption[]>([]);
  const [uploadfiles, setUploadFiles] = useState<RecordUploadFile[]>([]);

  useEffect(() => {
    if (selectedRecord) {
      setPreviewData([selectedRecord]);
    }
  }, [selectedRecord]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    console.log("Files:", files)
    console.log("File Attributes:", files[0])
    let newRecordOptions:any = [];
    let newUploadFiles:any = [];
    Array.from(files).forEach(file => {
      const id = mode === "edit" && selectedRecord ? selectedRecord.id : generateRecordId();
      newRecordOptions.push({
        id,
        enabled: false,
        weight: 100,
        fileName:file.name,
      })
      newUploadFiles.push({
        id,
        file
      })
    });
    setPreviewData(newRecordOptions);
    setUploadFiles(newUploadFiles);
  };

  return (
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title">
          {mode === "add" ? "Add New Record" : "Edit Record"}
        </h5>
        <button
          type="button"
          className="btn-close"
          onClick={onClose}
          aria-label="Close" />
      </div>
      <div className="modal-body">
        <FileControls
          onFileSelect={handleFileUpload}
          accept=".sgy"
          showDownload={false}
          multiple={mode === "add" ? true : false}
        />
        <>
          {previewData.length > 0 && (
            <div className="border rounded p-3 mb-3 overflow-auto" style={{ maxHeight: "200px" }}>
              <h6 className="mb-3">Preview Information:</h6>
              {previewData.map((data, index) => (
                <div key={`${data.fileName}-${index}`} className="card mb-2 p-2">
                  <div className="d-flex justify-content-between">
                    <strong>{data.fileName}</strong>
                    <span className="badge bg-primary">{index + 1}/{previewData.length}</span>
                  </div>
                  <div className="small text-muted">
                    <div>Weight: {data.weight}</div>
                    <div>Enabled: {data.enabled ? "Yes" : "No"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      </div>

      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => {
          onUploadFiles(uploadfiles);
          onAddRecordOptions(previewData)
          onClose()
        }}>
          {mode === "add" ? "Add" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default AddRecordOptions;