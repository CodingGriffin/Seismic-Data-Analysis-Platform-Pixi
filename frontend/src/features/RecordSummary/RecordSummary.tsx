"use client";

import type React from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { useAppSelector } from "../../hooks/useAppSelector";
import { updateRecordOption } from "../../store/slices/recordSlice";
import { selectOptions } from "../../store/selectors/recordSelectors";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useParams } from "react-router";
import { saveOptionsByProjectId } from "../../store/thunks/cacheThunks";

const RecordSummary: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projectId } = useParams();

  const enabledRecords = useAppSelector(selectOptions).filter((item) => item.enabled);
  
  const handleClearSelection = () => {
    enabledRecords.forEach((record) => {
      dispatch(
        updateRecordOption({
          id: record.id,
          enabled: false,
        })
      );
    });
  };

  const handleSelectRecord = (recordId: string) => {
    const event = new CustomEvent('scrollToRecord', { detail: { recordId } });
    window.dispatchEvent(event);
  };

  const handleSaveOptions = () => {
    dispatch(saveOptionsByProjectId(projectId));
  }

  return (
    <div className="border rounded d-flex flex-column">
      <SectionHeader
        title={`Selected (${enabledRecords.length})`}
        actions={
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={handleSaveOptions}
            >
              Save Options
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={handleClearSelection}
            >
              Clear
            </button>
          </div>
        }
      />

      <div className="overflow-auto m-2 no-select" style={{ height: "210px" }}>
        {enabledRecords.length === 0 ? (
          <div
            className="d-flex align-items-center justify-content-center h-100 w-100"
          >
            <p className="mb-0 text-muted">No records selected</p>
          </div>
        ) : (
          enabledRecords.map((recordOption) => (
            <div
              key={recordOption.id}
              className="card mb-2 cursor-pointer p-1"
              onClick={() => handleSelectRecord(recordOption.id)}
              style={{ cursor: "pointer", height: "62px" }}
            >
              <div className="card-body p-1 d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">{recordOption.fileName}</h6>
                  <small className="text-muted">
                    State: {recordOption.weight}
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
                  {enabledRecords.findIndex((currentRecordOption) => currentRecordOption.id === recordOption.id) + 1}
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
