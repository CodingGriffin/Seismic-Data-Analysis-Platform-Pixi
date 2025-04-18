"use client";

import type React from "react";
import { useRef } from "react";
import RecordCarousel from "../../features/RecordCarosel/RecordCarosel";
import SelectedRecordsSummary from "../../features/RecordSummary/RecordSummary";
import MainPlot from "../../features/MainRecord/MainPlot";
import { DataManager } from "../../features/DataManger/DataManager";
import { useParams } from "react-router";
import { useEffect } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { fetchOptionsByProjectId, fetchGridsByProjectId, fetchPicksByProjectId } from "../../store/thunks/cacheThunks";

const PicksPage: React.FC = () => {

  const { projectId } = useParams();
  const dispatch = useAppDispatch();
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (projectId === undefined) return;
    
    if (!initialFetchDone.current) {
      const fetchProjectDataById = async () => {
        dispatch(fetchOptionsByProjectId(projectId))
        dispatch(fetchGridsByProjectId(projectId));
        dispatch(fetchPicksByProjectId(projectId));
      }
      
      fetchProjectDataById();
      initialFetchDone.current = true;
    }
  }, [projectId, dispatch])

  return (
    <>
      <div className="responsive-container">
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-2">
            <DataManager/>
          </div>

          <div className="col-12 col-md-7">
            <RecordCarousel />
          </div>

          <div className="col-12 col-md-3">
            <SelectedRecordsSummary />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-12">
            <MainPlot />
          </div>
        </div>
      </div>
    </>
  );
};

export default PicksPage;
