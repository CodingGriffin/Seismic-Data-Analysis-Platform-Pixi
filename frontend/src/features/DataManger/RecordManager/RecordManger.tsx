import { RecordOption } from "../../../types/record";
import RecordButton from "./RecordButton/RecordButton";
import { useState } from "react";
import AddRecordOptions from "./AddRecordOptions/AddRecordOptions";
import EditRecordOptions from "./EditRecordOptions/EditRecordOptions";
import { Modal } from "../../../components/Modal/Modal";
import { RecordUploadFile } from "../../../types/record";

interface RecordManagerProps {
  recordOptions: RecordOption[];
  recordUploadFiles:{[key:string]:File|null};
  onUploadFiles: (files: RecordUploadFile[]|null) => void;
  onFilesChange:(data: {[key:string]:File|null}) => void;
  onRecordOptionsChange: (options: RecordOption[]) => void;
}

export default function RecordManager({ recordOptions, recordUploadFiles, onFilesChange, onUploadFiles, onRecordOptionsChange }: RecordManagerProps) {
  const [modals, setModals] = useState({
    addRecordOptions: false,
    editRecordOptions: false
  });
  const [isUpdated, setIsUpdated] = useState<boolean>(false);

  const handleRecordOptionsChange = (newRecordOptions: RecordOption[]) => {
    onRecordOptionsChange(newRecordOptions);
    setIsUpdated(true);
  };

  const handleModals = (modalName: string, value: boolean) => {
    Object.keys(modals).forEach((key) => {
      if (key !== modalName) {
        setModals((prev) => ({ ...prev, [key]: false }));
      }
    });
    setModals((prev) => ({ ...prev, [modalName]: value }));
  };

  return (
    <>
      <div className="container">
        <RecordButton
          recordOptionsLength={recordOptions.length}
          isUpdated={isUpdated}
          addRecordOptions={() => handleModals("addRecordOptions", true)}
          editRecordOptions={() => handleModals("editRecordOptions", true)}
        />
      </div>
      <Modal 
        isOpen={modals.addRecordOptions}
        onClose={() => handleModals("addRecordOptions", false)}
      >
        <AddRecordOptions
          mode="add"
          onAddRecordOptions={handleRecordOptionsChange}
          onUploadFiles={onUploadFiles}
          onClose={() => handleModals("addRecordOptions", false)}
        />
      </Modal>
      <Modal 
        isOpen={modals.editRecordOptions}
        onClose={() => handleModals("editRecordOptions", false)}
      >
        <EditRecordOptions
          initialRecordOptions={recordOptions}
          initialRecordUploadFiles={recordUploadFiles}
          onRecordOptionsChange={handleRecordOptionsChange}
          onFilesChange={onFilesChange}
          onClose={() => handleModals("editRecordOptions", false)}
        />
      </Modal>
    </>
  );
};
