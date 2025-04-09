import React from "react";
import { useRef, useState, useEffect } from "react";
import { Sprite, Texture } from "pixi.js";
import { BasePlot } from "../../../components/BasePlot/BasePlot";
import { Container } from "pixi.js";
import { extend } from "@pixi/react";
import { createTexture } from "../../../utils/plot-util";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { updateRecordOption } from "../../../store/slices/recordSlice";
import { updateRecordWeightDebounced } from "../../../store/thunks/recordThunks";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { selectRecordById } from "../../../store/selectors/recordSelectors";
import SectionHeader from "../../../components/SectionHeader/SectionHeader";

extend({ Container, Sprite });

interface RecordCardProps {
  id: string;
  isVisible: boolean;
}

const RecordCard: React.FC<RecordCardProps> = ({
  id,
  isVisible,
}) => {
  const { selectedColorMap, colorMaps } = useAppSelector((state) => state.plot);
  const record = useAppSelector((state) => selectRecordById(state, id));
  
  const colorMap = colorMaps[selectedColorMap];
  const dispatch = useAppDispatch();

  const [sliderValue, setSliderValue] = useState(record?.weight || 0);

  const plotRef = useRef<HTMLDivElement>(null);

  const textureRef = useRef<Texture | null>(null);
  const [texture, setTexture] = useState<Texture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleToggleSelection = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).tagName === "INPUT") {
      return;
    }

    dispatch(
      updateRecordOption({
        id,
        option: {
          enabled: !record?.enabled,
        },
      })
    );
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    dispatch(updateRecordWeightDebounced(id, value));
  };

  useEffect(() => {
    if (record?.weight !== undefined) {
      setSliderValue(record.weight);
    }
  }, [record?.weight]);

  const textureParamsRef = useRef({
    colorMap: null as any,
    data: null as any,
    dimensions: null as any,
    min: null as any,
    max: null as any
  });

  useEffect(() => {
    if (!isVisible || !record) {
      setIsLoading(true);
      return;
    }

    if (!record.data || !Array.isArray(record.data)) {
      return;
    }

    const params = textureParamsRef.current;
    const needsUpdate =
      colorMap !== params.colorMap ||
      record.data !== params.data ||
      record.dimensions.width !== (params.dimensions?.width || 0) ||
      record.dimensions.height !== (params.dimensions?.height || 0) ||
      record.min !== params.min ||
      record.max !== params.max;

    if (!needsUpdate) {
      if (textureRef.current) {
        setTexture(textureRef.current);
      }
      return;
    }

    textureParamsRef.current = {
      colorMap,
      data: record.data,
      dimensions: record.dimensions,
      min: record.min,
      max: record.max
    };

    const flatData = record.data.flat();
    if (flatData.length === 0) {
      return;
    }

    const newTexture = createTexture(
      flatData,
      record.dimensions,
      { min: record.min, max: record.max },
      colorMap
    );
    if (!newTexture) {
      return;
    }
    textureRef.current = newTexture;
    setTexture(newTexture);
  }, [colorMap, record, id, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setIsLoading(true);
    } else if (isVisible && texture) {
      setIsLoading(false);
    }
  }, [texture, isVisible]);

  const renderCardContent = () => {
    if (!isVisible || (isVisible && isLoading) || !record) {
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
            forceWidth={180}
            forceHeight={140}
          >
            <pixiContainer>
              <pixiSprite
                texture={texture}
                width={180}
                height={140}
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
    if (!record) return null;
    
    return (
      <div
        className="mx-2 d-flex flex-column justify-content-center"
        style={{ height: "70px" }}
      >
        <label
          htmlFor={`slider-${record.fileName}`}
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

  if (!record) {
    return null;
  }

  return (
    <div
      className={`card p-0 no-select ${record.enabled ? "border-primary bg-light" : ""}`}
      style={{
        cursor: isVisible ? "pointer" : "default",
        transition: "all 0.2s ease",
        opacity: isVisible ? 1 : 0.8,
      }}
      onClick={isVisible ? handleToggleSelection : undefined}
    >
      <div>
        <SectionHeader title={record.fileName}>
          {record.enabled && <span className="badge bg-primary">Selected</span>}
        </SectionHeader>
      </div>
      <div className="card-body p-2">
        {renderCardContent()}
        {renderSlider()}
      </div>
    </div>
  );
};

export default RecordCard;