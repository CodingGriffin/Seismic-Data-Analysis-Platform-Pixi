"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "../../components/Button/Button";
import RecordCarousel from "../../features/RecordCarosel/RecordCarosel";
import SelectedRecordsSummary from "../../features/RecordSummary/RecordSummary";
import DrawingCanvas from "../../features/MainRecord/MainRecord";
import { DataManger } from "../../features/DataManger/DataManger";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { useAppSelector } from "../../hooks/useAppSelector";
import { updateRecord } from "../../store/slices/recordSlice";

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { itemsMap, orderedIds } = useAppSelector((state) => state.record);

  const [scrollToRecordId, setScrollToRecordId] = useState<string | null>(null);

  const [showDataManager, setShowDataManager] = useState<boolean>(false);
  const toggleRecordSelection = (recordId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).tagName === "INPUT") {
      return;
    }
    const prevRecord = itemsMap[recordId];
    dispatch(
      updateRecord({
        id: recordId,
        data: {
          ...prevRecord,
          enabled: !prevRecord.enabled,
        },
      })
    );
  };

  const handleSliderChange = (recordId: string, value: number) => {
    dispatch(
      updateRecord({
        id: recordId,
        data: {
          ...itemsMap[recordId],
          weight: value,
        },
      })
    );
  };

  const clearSelections = () => {
    orderedIds.forEach((recordId) => {
      dispatch(
        updateRecord({
          id: recordId,
          data: {
            ...itemsMap[recordId],
            enabled: false,
          },
        })
      );
    });
  };

  const handleSelectRecord = (recordId: string) => {
    setScrollToRecordId(recordId);
    setTimeout(() => setScrollToRecordId(null), 100);
  };

  return (
    <>
      <div className="container-fluid p-3">
        <div className="row mb-3">
          <div className="col-md-2">
            <div className="d-flex flex-column gap-3 border rounded p-3 items-center" style={{height:'270px'}}>
              <h5 className="mb-3">Controls</h5>
              <Button
                variant="primary"
                onClick={() => setShowDataManager(true)}
              >
                Manage Data
              </Button>
              <Button variant="primary">Update Plots</Button>
              <Button variant="primary">Download</Button>
            </div>
          </div>

          <div className="col-md-7">
            <RecordCarousel
              records={itemsMap}
              orderedIds={orderedIds}
              onToggleSelection={toggleRecordSelection}
              onSliderChange={handleSliderChange}
              scrollToRecordId={scrollToRecordId}
            />
          </div>

          <div className="col-md-3">
            <SelectedRecordsSummary
              records={itemsMap}
              orderedIds={orderedIds}
              onClearSelection={clearSelections}
              onSelectRecord={handleSelectRecord}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12 h-100 mt-5">
            <DrawingCanvas />
          </div>
        </div>
      </div>
      {showDataManager && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal show d-block">
            <div className="modal-dialog h-75 w-75">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Manage Data</h5>
                  <Button
                    variant="secondary"
                    className="btn-close"
                    onClick={() => setShowDataManager(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <DataManger />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Dashboard;
