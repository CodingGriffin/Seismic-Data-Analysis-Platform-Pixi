"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { RecordItem } from "../../../../types/record";
import { Button } from "../../../../components/Button/Button";
import { Modal } from "../../../../components/Modal/Modal";
import { SortableRecordRow } from "./SortableRecordRow";

interface EditRecordProps {
  records: { [key: string]: RecordItem };  // Changed from Map to plain object
  orderedIds: string[];
  showConfirmation: boolean;
  showDeleteConfirmation: boolean;
  selectedRecordId: string;
  onRecordDelete: (id: string) => void;
  onRecordDeleteAll: () => void;
  onRecordReorder: (orderedIds: string[]) => void;
  onRecordUpdate: (id: string) => void;
  onRecordAdd: () => void;
  onShowDeleteConfirm: (id: string) => void;
  onShowDeleteAllConfirm: () => void;
  onCloseDeleteConfirm: () => void;
  onCloseDeleteAllConfirm: () => void;
  onClose: () => void;
}

export default function EditRecord({
  records,
  orderedIds,
  showConfirmation,
  showDeleteConfirmation,
  selectedRecordId,
  onRecordDelete,
  onRecordDeleteAll,
  onRecordReorder,
  onRecordUpdate,
  onRecordAdd,
  onShowDeleteConfirm,
  onShowDeleteAllConfirm,
  onCloseDeleteConfirm,
  onCloseDeleteAllConfirm,
  onClose,
}: EditRecordProps) {

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 0,
        tolerance: 0,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrderedIds = arrayMove(orderedIds, oldIndex, newIndex);
      onRecordReorder(newOrderedIds);
    }
  };

  return (
    <>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">View / Edit Record</h5>
          <Button
            variant="secondary"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          />
        </div>
        <div className="modal-body">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {orderedIds.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Index</th>
                      <th>Dimensions</th>
                      <th>Range</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext
                      items={orderedIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {orderedIds.map((id, index) => {
                        const record = records[id];  // Changed from records.get(id)
                        if (!record) return null;
                        
                        return (
                          <SortableRecordRow
                            key={id}
                            record={record}
                            index={index}
                            orderId={id}
                            onDelete={onShowDeleteConfirm}
                            onUpdate={onRecordUpdate}
                          />
                        );
                      })}
                    </SortableContext>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-5">
                <p className="text-muted mb-3">No records available.</p>
                <p className="text-muted">
                  Click "Add Record" to start adding records.
                </p>
              </div>
            )}
          </DndContext>
        </div>
        <div className="modal-footer">
          <div className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={onRecordAdd}
            >
              Add Record
            </Button>
            <Button
              variant="danger"
              onClick={onShowDeleteAllConfirm}
              disabled={orderedIds.length === 0}
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
        onClose={onCloseDeleteConfirm}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Deletion</h5>
            <Button
              variant="secondary"
              className="btn-close"
              onClick={onCloseDeleteConfirm}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            {orderedIds.length > 1 ? (
              <p>
                Are you sure you want to delete Record {selectedRecordId + 1}?
              </p>
            ) : (
              <p>Are you sure you want to delete the only record?</p>
            )}
          </div>
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={onCloseDeleteConfirm}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={() => onRecordDelete(selectedRecordId)}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirmation}
        onClose={onCloseDeleteAllConfirm}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Delete All</h5>
            <Button
              variant="secondary"
              className="btn-close"
              onClick={onCloseDeleteAllConfirm}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete all records?</p>
          </div>
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={onCloseDeleteAllConfirm}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={onRecordDeleteAll}>
              Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
