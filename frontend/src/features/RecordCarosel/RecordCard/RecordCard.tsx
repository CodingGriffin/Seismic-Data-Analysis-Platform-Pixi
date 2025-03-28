import React from "react";
import { useRef, useState, useCallback, useEffect } from "react";
import { Sprite, Texture } from "pixi.js";
import { BasePlot } from "../../../components/BasePlot/BasePlot";
import { Container } from "pixi.js";
import { extend } from "@pixi/react";
import { createTexture } from "../../../utils/plot-util";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { updateRecordState } from "../../../store/slices/recordSlice";
import { updateRecordWeightDebounced } from "../../../store/thunks/recordThunks";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { selectRecordData, selectRecordState } from "../../../store/selectors/recordSelectors";

extend({ Container, Sprite });

interface RecordCardProps {
  id: string;
}

const RecordCard: React.FC<RecordCardProps> = ({
  id,
}) => {
  const { selectedColorMap, colorMaps } = useAppSelector((state) => state.plot);
  const recordData = useAppSelector((state) => selectRecordData(state, id));
  const recordState = useAppSelector((state) => selectRecordState(state, id));

  const colorMap = colorMaps[selectedColorMap];
  const dispatch = useAppDispatch();

  const [sliderValue, setSliderValue] = useState(recordState.weight);

  const plotRef = useRef<HTMLDivElement>(null);

  const textureRef = useRef<Texture | null>(null);
  const [texture, setTexture] = useState<Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plotDimensions, setPlotDimensions] = useState({
    width: 180,
    height: 168,
  });

  const handleDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      setPlotDimensions(dimensions);
    },
    []
  );

  const handleToggleSelection = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).tagName === "INPUT") {
      return;
    }

    dispatch(
      updateRecordState({
        id,
        state: {
          enabled: !recordState.enabled,
        },
      })
    );
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    dispatch(updateRecordWeightDebounced(id, value));
  };

  useEffect(() => {
    setSliderValue(recordState.weight);
  }, [recordState.weight]);

  const textureParamsRef = useRef({
    colorMap: null as any,
    data: null as any,
    dimensions: null as any,
    min: null as any,
    max: null as any
  });

  useEffect(() => {
    if (!recordData.data || !Array.isArray(recordData.data)) {
      setIsLoading(false);
      return;
    }

    const params = textureParamsRef.current;
    const needsUpdate = 
      colorMap !== params.colorMap ||
      recordData.data !== params.data ||
      recordData.dimensions.width !== (params.dimensions?.width || 0) ||
      recordData.dimensions.height !== (params.dimensions?.height || 0) ||
      recordData.min !== params.min ||
      recordData.max !== params.max;
      
    if (!needsUpdate) {
      if (textureRef.current) {
        setTexture(textureRef.current);
        setIsLoading(false);
      }
      return;
    }
    
    textureParamsRef.current = {
      colorMap,
      data: recordData.data,
      dimensions: recordData.dimensions,
      min: recordData.min,
      max: recordData.max
    };
    
    setIsLoading(true);
    const flatData = recordData.data.flat();
    if (flatData.length === 0) {
      setIsLoading(false);
      return;
    }

    console.log("Creating new texture for record:", id);
    
    const newTexture = createTexture(
      flatData,
      recordData.dimensions,
      { min: recordData.min, max: recordData.max },
      colorMap
    );
    if (!newTexture) {
      setIsLoading(false);
      return;
    }
    textureRef.current = newTexture;
    setTexture(newTexture);
    setIsLoading(false);
  }, [colorMap, recordData.data, recordData.dimensions, recordData.min, recordData.max, id]);

  useEffect(() => {
    setIsLoading(false);
  }, [texture])

  return (
    <div
      className={`card p-0 no-select ${recordState.enabled ? "border-primary bg-light" : ""}`}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={handleToggleSelection}
    >
      <div>
        <div
          className="d-flex justify-content-between align-items-center mb-0 px-2 border-bottom"
          style={{ height: "42px" }}
        >
          <h5 className="card-title m-0 fs-6">{recordData.fileName}</h5>
          {recordState.enabled && <span className="badge bg-primary">Selected</span>}
        </div>
      </div>
      <div className="card-body p-2">
        <div className="d-flex justify-content-center align-items-center position-relative">
          {!isLoading && texture && texture.width > 0 ? (
            <BasePlot
              ref={plotRef}
              onDimensionChange={handleDimensionChange}
            >
              <pixiContainer>
                <pixiSprite
                  texture={texture}
                  width={plotDimensions.width}
                  height={plotDimensions.height}
                  anchor={0}
                  x={0}
                  y={0}
                />
              </pixiContainer>
            </BasePlot>
          ) : (
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-light bg-opacity-75">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
        </div>
        <div
          className="mx-2 d-flex flex-column justify-content-center"
          style={{ height: "70px" }}
        >
          <label
            htmlFor={`slider-${recordData.fileName}`}
            className="form-label d-flex justify-content-between"
          >
            <span>State:</span>
            <span>{sliderValue}</span>
          </label>
          <input
            type="range"
            className="form-range"
            id={`slider-${id}`}
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => handleSliderChange(Number.parseInt(e.target.value))}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="progress" style={{ height: "4px" }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${sliderValue}%` }}
              aria-valuenow={sliderValue}
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
