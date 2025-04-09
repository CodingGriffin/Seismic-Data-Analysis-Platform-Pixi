import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RecordOption } from "../../../../types/record";
import SectionHeader from "../../../../components/SectionHeader/SectionHeader";

interface SortableRecordOptionRowProps {
  record: RecordOption;
  index: number;
  onToggleEnabled: (enabled: boolean) => void;
  onWeightChange: (weight: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const SortableRecordOptionRow: React.FC<SortableRecordOptionRowProps> = ({
  record,
  index,
  onToggleEnabled,
  onWeightChange,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: record.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="list-group-item p-0 mb-2 border rounded"
      {...attributes}
    >
      <SectionHeader
        title={`#${index + 1}: ${record.fileName} : ${record.id}`}
        className={record.enabled ? "bg-light" : ""}
      >
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={record.enabled}
            onChange={() => onToggleEnabled(record.enabled)}
            id={`record-enabled-${record.id}`}
          />
          <label className="form-check-label" htmlFor={`record-enabled-${record.id}`}>
            Enabled
          </label>
        </div>
      </SectionHeader>
      
      <div className="d-flex justify-content-between align-items-center p-2">
        <div 
          className="me-3 cursor-move" 
          {...listeners}
          style={{ cursor: 'grab' }}
        >
          <i className="bi bi-grip-vertical"></i>
        </div>
        
        <div className="d-flex align-items-center flex-grow-1">
          <div className="me-3" style={{ width: "120px" }}>
            <label
              htmlFor={`weight-${record.id}`}
              className="form-label d-flex justify-content-between mb-0"
            >
              <small>Weight:</small>
              <small>{record.weight}</small>
            </label>
            <input
              type="range"
              className="form-range"
              min="0"
              max="100"
              step="1"
              value={record.weight}
              onChange={(e) => onWeightChange(parseInt(e.target.value))}
              id={`weight-${record.id}`}
            />
          </div>
          
          <div className="ms-auto">
            <button
              className="btn btn-sm btn-outline-primary me-2"
              onClick={onEdit}
              title="Edit"
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={onDelete}
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
