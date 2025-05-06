"use client";

import type React from "react";
import RecordCarousel from "../../features/RecordCarosel/RecordCarosel";
import SelectedRecordsSummary from "../../features/RecordSummary/RecordSummary";
import MainPlot from "../../features/MainRecord/MainPlot";
import { DataManager } from "../../features/DataManger/DataManager";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import PicksSettingsSave from "../../features/PicksSettingsSave/PicksSettingsSave";
const PicksPage: React.FC = () => {

  return (
    <>
      <div className="container-fluid py-4">
        <div className="row mb-4">
            <div className="col-12">
                <SectionHeader title="Picks Analysis">
                    <div className='d-flex gap-2'>
                        <PicksSettingsSave/>
                    </div>
                </SectionHeader>
            </div>
        </div>
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
