import { Input } from "../../../components/Input/Input";
import { useState } from "react";

interface FreqSlowMangerProps {
  numFreq: number;
  maxFreq: number;
  numSlow: number;
  maxSlow: number;
  onNumFreqChange: (value: number) => void;
  onMaxFreqChange: (value: number) => void;
  onNumSlowChange: (value: number) => void;
  onMaxSlowChange: (value: number) => void;
}

export const FreqSlowManger = ({
    numFreq, 
    maxFreq, 
    numSlow, 
    maxSlow, 
    onNumFreqChange, 
    onMaxFreqChange,
    onNumSlowChange,
    onMaxSlowChange
  }:FreqSlowMangerProps) => {
  
  const [isUpdated, setIsUpdated] = useState<boolean>(false);
  
  const handleNumFreqChange = (value: string) => {
    onNumFreqChange(parseInt(value));
    setIsUpdated(true);
  };
  
  const handleMaxFreqChange = (value: string) => {
    onMaxFreqChange(parseFloat(value));
    setIsUpdated(true);
  };
  
  const handleNumSlowChange = (value: string) => {
    onNumSlowChange(parseInt(value));
    setIsUpdated(true);
  };
  
  const handleMaxSlowChange = (value: string) => {
    onMaxSlowChange(parseFloat(value));
    setIsUpdated(true);
  };
  
  return (
    <div className="d-flex flex-column align-items-center gap-2 mt-3">
      <div className="d-flex justify-content-center align-items-center">
          <h1 className="mb-0 text-center">Frequency & Slowness</h1>
          {isUpdated && <span className="badge bg-info ms-2">Updated</span>}
      </div>
      <div className="row mb-3 mt-3">
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Number of Frequency Points:</label>
            <Input
              type="number"
              value={numFreq}
              onChange={handleNumFreqChange}
              className="flex-grow-1"
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Number of Slowness Points:</label>
            <Input
              type="number"
              value={numSlow}
              onChange={handleNumSlowChange}
              className="flex-grow-1"
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Max Frequency:</label>
            <Input
              type="number"
              value={maxFreq}
              onChange={handleMaxFreqChange}
              className="flex-grow-1"
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Max Slow:</label>
            <Input
              type="number"
              value={maxSlow}
              onChange={handleMaxSlowChange}
              className="flex-grow-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
