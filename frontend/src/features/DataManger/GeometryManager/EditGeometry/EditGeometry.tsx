"use client";

import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GeometryItem } from "../../../../types/geometry";
import { Button } from "../../../../components/Button/Button";
import { Input } from "../../../../components/Input/Input";
import { Modal } from "../../../../components/Modal/Modal";
import { SortableRow } from "./SortableRow";

interface EditGeometryProps {
  initialPoints: GeometryItem[];
  onPointsChange?: (points: GeometryItem[]) => void;
  onClose: () => void;
}

export default function EditGeometry({ initialPoints, onPointsChange, onClose }: EditGeometryProps) {
  const [points, setPoints] = useState<GeometryItem[]>(initialPoints);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [inputAsDepth, setInputAsDepth] = useState(false);
  const [units, setUnits] = useState<"Meters" | "Feet">("Meters");
  const [peakElevation] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePointChange = (
    index: number,
    field: keyof GeometryItem,
    value: number
  ) => {
    const newPoints = points.map((point) => {
      if (point.index === index + 1) {
        if (field === "z" && inputAsDepth) {
          // If inputting as depth, convert to elevation
          return { ...point, [field]: peakElevation - value };
        }
        return { ...point, [field]: value };
      }
      return point;
    });
    setPoints(newPoints);
    onPointsChange?.(newPoints);
  };

  const addPoint = () => {
    const newPoint: GeometryItem = {
      index: points.length + 1,
      x: 0,
      y: 0,
      z: 0,
    };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    onPointsChange?.(newPoints);
  };

  const deletePoint = (index: number) => {
    const newPoints = points
      .filter((point) => point.index !== index)
      .map((point, idx) => ({ ...point, index: idx + 1 }));
    setPoints(newPoints);
    onPointsChange?.(newPoints);
  };

  const deleteAll = () => {
    setPoints([]);
    onPointsChange?.([]);
    setShowConfirmation(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = points.findIndex((point) => point.index === active.id);
    const newIndex = points.findIndex((point) => point.index === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newPoints = arrayMove(points, oldIndex, newIndex).map(
        (point, idx) => ({ ...point, index: idx + 1 })
      );
      setPoints(newPoints);
      onPointsChange?.(newPoints);
    }
  };

  return (
    <>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">View / Edit Geometry</h5>
          <Button variant="secondary" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>
        <div className="modal-body">
          <div className="d-flex justify-content-between mb-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <Input
                  label={`Peak Elevation (${units}):`}
                  type="number"
                  value={peakElevation.toFixed(2)}
                  onChange={() => {}}
                  disabled
                  style={{ width: '120px' }}
                />
              </div>
              <div className="form-check form-switch mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="inputAsDepth"
                  checked={inputAsDepth}
                  onChange={(e) => setInputAsDepth(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="inputAsDepth">
                  Input Z as Depth from Peak
                </label>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <select
                id="units"
                className="form-select"
                value={units}
                onChange={(e) => setUnits(e.target.value as "Meters" | "Feet")}
              >
                <option value="Meters">Meters</option>
                <option value="Feet">Feet</option>
              </select>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {points.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Index</th>
                      <th>X</th>
                      <th>Y</th>
                      <th>Z</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext
                      items={points.map((point) => point.index)}
                      strategy={verticalListSortingStrategy}
                    >
                      {points.map((point, idx) => (
                        <SortableRow
                          key={point.index}
                          point={point}
                          index={idx}
                          onDelete={deletePoint}
                          onPointChange={handlePointChange}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-5">
                <p className="text-muted mb-3">No geometry points available.</p>
                <p className="text-muted">Click "Add Point" to start adding geometry points.</p>
              </div>
            )}
          </DndContext>
        </div>
        <div className="modal-footer">
          <div className="d-flex gap-2">
            <Button variant="primary" onClick={addPoint}>
              Add Point
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowConfirmation(true)}
              disabled={points.length === 0}
            >
              Delete All
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Deletion</h5>
            <Button
              variant="secondary"
              className="btn-close"
              onClick={() => setShowConfirmation(false)}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete all {points.length} points? This action cannot be undone.</p>
          </div>
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={deleteAll}
            >
              Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
