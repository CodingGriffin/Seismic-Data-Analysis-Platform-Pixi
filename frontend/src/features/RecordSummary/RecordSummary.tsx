"use client";

import type React from "react";
import { RecordItem } from "../../types/record";

interface SelectedRecordsSummaryProps {
  records: { [key: string]: RecordItem };
  orderedIds: string[];
  onClearSelection: () => void;
  onSelectRecord: (recordId: string) => void;
}

const SelectedRecordsSummary: React.FC<SelectedRecordsSummaryProps> = ({
  records,
  orderedIds,
  onClearSelection,
  onSelectRecord,
}) => {
  const selectedRecordObjects = orderedIds.filter(
    (recordId) => records[recordId].enabled
  );

  return (
    <div className="border rounded d-flex flex-column">
      <div
        className="d-flex justify-content-between align-items-center p-2 border-bottom"
        style={{ height: "42px" }}
      >
        <h6 className="mb-0">Selected ({selectedRecordObjects.length})</h6>
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={onClearSelection}
        >
          Clear
        </button>
      </div>

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
              onClick={() => onSelectRecord(recordId)}
              style={{ cursor: "pointer", height: "62px" }}
            >
              <div className="card-body p-1 d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">{records[recordId].fileName}</h6>
                  <small className="text-muted">
                    State: {records[recordId].weight}
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

export default SelectedRecordsSummary;
