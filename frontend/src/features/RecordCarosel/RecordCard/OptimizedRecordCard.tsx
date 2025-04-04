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
import SectionHeader from "../../../components/SectionHeader/SectionHeader";

extend({ Container, Sprite });

interface OptimizedRecordCardProps {
  id: string;
  isVisible: boolean;
}

const OptimizedRecordCard: React.FC<OptimizedRecordCardProps> = ({
  id,
  isVisible,
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
  const [isLoading, setIsLoading] = useState(false);
  const [plotDimensions, setPlotDimensions] = useState({
    width: 180,
    height: 140,
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
    if (!isVisible) {
      setIsLoading(true);
      return;
    }

    if (!recordData.data || !Array.isArray(recordData.data)) {
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

    const flatData = recordData.data.flat();
    if (flatData.length === 0) {
      return;
    }

    const newTexture = createTexture(
      flatData,
      recordData.dimensions,
      { min: recordData.min, max: recordData.max },
      colorMap
    );
    if (!newTexture) {
      return;
    }
    textureRef.current = newTexture;
    setTexture(newTexture);
  }, [colorMap, recordData.data, recordData.dimensions, recordData.min, recordData.max, id, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setIsLoading(true);
    } else if (isVisible && texture) {
      setIsLoading(false);
    }
  }, [texture, isVisible]);

  const renderCardContent = () => {
    if (!isVisible || (isVisible && isLoading)) {
      return (
        <div className="d-flex justify-content-center align-items-center position-relative" style={{ height: "140px" }}>
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-light bg-opacity-75">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center position-relative" style={{ height: "140px" }}>
        {texture && texture.width > 0 ? (
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
    );
  };

  const renderSlider = () => {
    return (
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
          id={`slider-${id}`}
          min="0"
          max="100"
          value={sliderValue}
          onChange={isVisible ? (e) => handleSliderChange(Number.parseInt(e.target.value)) : undefined}
          onClick={isVisible ? (e) => e.stopPropagation() : undefined}
          disabled={!isVisible}
        />
      </div>
    );
  };

  return (
    <div
      className={`card p-0 no-select ${recordState.enabled ? "border-primary bg-light" : ""}`}
      style={{
        cursor: isVisible ? "pointer" : "default",
        transition: "all 0.2s ease",
        opacity: isVisible ? 1 : 0.8,
      }}
      onClick={isVisible ? handleToggleSelection : undefined}
    >
      <div>
        <SectionHeader title={recordData.fileName}>
          {recordState.enabled && <span className="badge bg-primary">Selected</span>}
        </SectionHeader>
      </div>
      <div className="card-body p-2">
        {renderCardContent()}
        {renderSlider()}
      </div>
    </div>
  );
};

export default OptimizedRecordCard;
