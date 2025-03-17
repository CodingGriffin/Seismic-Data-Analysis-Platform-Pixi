import RecordButton from "./RecordButton/RecordButton";
import AddRecord from "./AddRecord/AddRecord";
import RecordEditor from "./EditRecord/EditRecord";
import { Modal } from "../../../components/Modal/Modal";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import {
  setRecords,
  setShowAddRecord,
  setShowEditRecord,
  addRecord,
  deleteRecord,
  updateRecord,
  reorderRecords,
} from "../../../store/slices/recordSlice";
import { RecordItem } from "../../../types/record";
import { useEffect, useState } from "react";

export const RecordManager = () => {
  const dispatch = useAppDispatch();
  const { itemsMap, orderedIds } = useAppSelector((state) => state.record);
  const { showAddRecord, showEditRecord } = useAppSelector(
    (state) => state.record
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [addMode, setAddMode] = useState<"add" | "edit" | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");

  const handleRecordAdd = (id: string | null, data: RecordItem) => {
    if (addMode === "edit" && id) {
      dispatch(updateRecord({ id, data }));
    } else {
      dispatch(addRecord(data));
    }
    setAddMode(null);
  };

  const handleRecordDelete = (id: string) => {
    dispatch(deleteRecord(id));
    setShowConfirmation(false);
  };

  const handleRecordDeleteAll = () => {
    dispatch(setRecords([]));
    setShowDeleteConfirmation(false);
  };

  const handleRecordUpdate = (
    id: string,
    data:RecordItem|null
  ) => {
    setSelectedRecordId(id);
    if (data !== null) {
      dispatch(updateRecord({id, data}))
    } else {
      setAddMode("edit");
    }
  };

  const handleRecordReorder = (orderedIds: string[]) => {
    dispatch(reorderRecords(orderedIds));
  };

  const handleShowDeleteConfirm = (id: string) => {
    setSelectedRecordId(id);
    setShowConfirmation(true);
  };

  useEffect(() => {
    console.log("AddMode:", addMode);
    if (addMode !== null) {
      dispatch(setShowAddRecord(true));
    } else {
      dispatch(setShowAddRecord(false));
    }
  }, [addMode]);

  return (
    <>
      <div className="container mt-5 flex-1">
        <RecordButton
          records={orderedIds}
          addRecord={() => setAddMode("add")}
          editRecord={() => dispatch(setShowEditRecord(true))}
        />
      </div>

      <Modal
        isOpen={showAddRecord || showEditRecord}
        onClose={() => {
          setAddMode(null);
          dispatch(setShowAddRecord(false));
          dispatch(setShowEditRecord(false));
        }}
        className="Record-modal"
      >
        {addMode && (
          <AddRecord
            selectedRecordId={selectedRecordId}
            onAddRecord={handleRecordAdd}
            mode={addMode}
            onClose={() => setAddMode(null)}
          />
        )}
        {showEditRecord && (
          <RecordEditor
            records={itemsMap}
            orderedIds={orderedIds}
            showConfirmation={showConfirmation}
            showDeleteConfirmation={showDeleteConfirmation}
            selectedRecordId={selectedRecordId}
            onRecordDelete={handleRecordDelete}
            onRecordDeleteAll={handleRecordDeleteAll}
            onRecordReorder={handleRecordReorder}
            onRecordUpdate={handleRecordUpdate}
            onRecordAdd={() => setAddMode("add")}
            onShowDeleteConfirm={handleShowDeleteConfirm}
            onShowDeleteAllConfirm={() => setShowDeleteConfirmation(true)}
            onCloseDeleteConfirm={() => setShowConfirmation(false)}
            onCloseDeleteAllConfirm={() => setShowDeleteConfirmation(false)}
            onClose={() => dispatch(setShowEditRecord(false))}
          />
        )}
      </Modal>
    </>
  );
};
