"use client";

import type React from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { useAppSelector } from "../../hooks/useAppSelector";
import { updateRecordState } from "../../store/slices/recordSlice";
import { selectRecordItems } from "../../store/selectors/recordSelectors";
import SectionHeader from "../../components/SectionHeader/SectionHeader";

const RecordSummary: React.FC = () => {
  const dispatch = useAppDispatch();
  const { itemsMap, orderedIds } = useAppSelector(selectRecordItems);
  
  const selectedRecordObjects = orderedIds.filter(
    (recordId) => itemsMap[recordId].enabled
  );

  const handleClearSelection = () => {
    orderedIds.forEach((recordId) => {
      dispatch(
        updateRecordState({
          id: recordId,
          state: {
            enabled: false,
          },
        })
      );
    });
  };

  const handleSelectRecord = (recordId: string) => {
    const event = new CustomEvent('scrollToRecord', { detail: { recordId } });
    window.dispatchEvent(event);
  };

  return (
    <div className="border rounded d-flex flex-column">
      <SectionHeader
        title={`Selected (${selectedRecordObjects.length})`}
        actions={
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={handleClearSelection}
          >
            Clear
          </button>
        }
      />

      <div className="overflow-auto m-2 no-select" style={{ height: "210px" }}>
        {selectedRecordObjects.length === 0 ? (
          <div
            className="d-flex align-items-center justify-content-center h-100 w-100"
          >
            <p className="mb-0 text-muted">No records selected</p>
          </div>
        ) : (
          selectedRecordObjects.map((recordId) => (
            <div
              key={recordId}
              className="card mb-2 cursor-pointer p-1"
              onClick={() => handleSelectRecord(recordId)}
              style={{ cursor: "pointer", height: "62px" }}
            >
              <div className="card-body p-1 d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">{itemsMap[recordId].fileName}</h6>
                  <small className="text-muted">
                    State: {itemsMap[recordId].weight}
                  </small>
                </div>
                <div
                  className="rounded-circle bg-primary text-white"
                  style={{
                    width: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                  }}
                >
                  {orderedIds.findIndex((id) => id === recordId) + 1}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecordSummary;
