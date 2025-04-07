import { useState } from "react";
import { GeometryItem } from "../../../types/geometry";
import GeometryButton from "./GeometryButton/GeometryButton";
import AddGeometry from "./AddGeometry/AddGeometry";
import GeometryEditor from "./EditGeometry/EditGeometry";
import { Modal } from "../../../components/Modal/Modal";

interface GeometryManagerProps {
  geometry: GeometryItem[];
  onGeometryChange: (geometry: GeometryItem[]) => void;
}

export const GeometryManager = ({
  geometry,
  onGeometryChange,
}:GeometryManagerProps) => {
  const [showAddGeometry, setShowAddGeometry] = useState<boolean>(false);
  const [showEditGeometry, setShowEditGeometry] = useState<boolean>(false);
  const [isUpdated, setIsUpdated] = useState<boolean>(false);

  const handleGeometryChange = (newGeometry: GeometryItem[]) => {
    onGeometryChange(newGeometry);
    setIsUpdated(true);
  };

  return (
    <>
      <div className="container">
        <GeometryButton 
          geometryLength={geometry.length}
          isUpdated={isUpdated} 
          addGeometry={() => setShowAddGeometry(true)} 
          editGeometry={() => setShowEditGeometry(true)}
        />
      </div>

      <Modal 
        isOpen={showAddGeometry || showEditGeometry}
        onClose={() => {
          setShowAddGeometry(false);
          setShowEditGeometry(false);
        }}
        className="geometry-modal"
      >
        {showAddGeometry && (
          <AddGeometry
            onSetGeometry={handleGeometryChange}
            onClose={() => setShowAddGeometry(false)}
          />
        )}
        {showEditGeometry && (
          <GeometryEditor
            initialPoints={geometry}
            onPointsChange={handleGeometryChange}
            onClose={() => setShowEditGeometry(false)}
          />
        )}
      </Modal>
    </>
  );
};
