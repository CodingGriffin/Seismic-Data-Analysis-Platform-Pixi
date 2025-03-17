"use client";

import type React from "react";
import { RecordItem } from "../../../types/record";

interface RecordCardProps {
  id: string;
  record: RecordItem;
  onToggleSelection: (id: string, event: React.MouseEvent) => void;
  onSliderChange: (id: string, value: number) => void;
}

const RecordCard: React.FC<RecordCardProps> = ({
  id,
  record,
  onToggleSelection,
  onSliderChange,
}) => {
  return (
    <div
      className={`card p-0 no-select ${
        record.enabled ? "border-primary bg-light" : ""
      }`}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={(e) => onToggleSelection(id, e)}
    >
      <div>
        <div
          className="d-flex justify-content-between align-items-center mb-0 px-2 border-bottom"
          style={{ height: "42px" }}
        >
          <h5 className="card-title m-0 fs-6">{record.fileName}</h5>
          {record.enabled && <span className="badge bg-primary">Selected</span>}
        </div>
      </div>
      <div className="card-body p-2">
        <div className="d-flex justify-content-center align-items-center">
          <div
            className="border rounded"
            style={{
              width: "180px",
              height: "140px",
            }}
          >
            Preview
          </div>
        </div>
        <div
          className="mx-2 d-flex flex-column justify-content-center"
          style={{ height: "70px" }}
        >
          <label
            htmlFor={`slider-${record.fileName}`}
            className="form-label d-flex justify-content-between"
          >
            <span>State:</span>
            <span>{record.weight}</span>
          </label>
          <input
            type="range"
            className="form-range"
            id={`slider-${id}`}
            min="0"
            max="100"
            value={record.weight}
            onChange={(e) =>
              onSliderChange(id, Number.parseInt(e.target.value))
            }
            onClick={(e) => e.stopPropagation()}
          />
          <div className="progress" style={{ height: "4px" }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${record.weight}%` }}
              aria-valuenow={record.weight}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordCard;
