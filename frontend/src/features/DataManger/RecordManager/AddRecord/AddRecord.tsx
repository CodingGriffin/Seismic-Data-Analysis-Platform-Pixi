import { useState, type ChangeEvent } from "react";
import { FileControls } from "../../../../components/FileControls/FileControls";
import { RecordItem } from "../../../../types/record";
// import { extractDataFromNpy } from "../../../../utils/npy-util";
// import { rotateClockwise, flipVertical } from "../../../../utils/matrix-util";

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
  const [previewData, setPreviewData] = useState<RecordItem[]>([]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const uploadedData: RecordItem[] = [];

    for (const file of Array.from(files)) {
      // const data = await extractDataFromNpy(file);
      // if (!data) continue;

      // let { matrix: rotated } = rotateClockwise(data.data);
      // let { matrix: transformed, shape } = flipVertical(rotated);

      const record: RecordItem = {
        fileName: file.name,
        enabled: false,
        weight: 0,
        data: [],
        dimensions: {
          width: 0,
          height: 0,
        },
        shape: [0, 0],
        min: 0,
        max: 0,
      };

      uploadedData.push(record);
    }

    setPreviewData(uploadedData);
  };

  const isEditMode = mode === "edit";
  const title = isEditMode ? "Edit Record" : "Add Record";
  const buttonText = isEditMode ? "Replace Data" : "Load Data";
  const seletectedRecordId = selectedRecordId;

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
              multiple = {mode === "add" ? true:false}
            />
            <>
              {previewData.length > 0 &&
                previewData.map((data, index) => <div key={`${data.fileName}-${index}`}>{data.fileName}</div>)}
            </>
            <div></div>
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-primary w-100"
              disabled={!previewData}
              onClick={() =>
                mode === "edit" && seletectedRecordId
                  ? onAddRecord(seletectedRecordId, previewData[0]!)
                  : onAddRecord(null, previewData!)
              }
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
