import { useState } from "react";
import { GeometryItem } from "../../../types/geometry";
import GeometryButton from "./GeometryButton/GeometryButton";
import AddGeometry from "./AddGeometry/AddGeometry";
import EditGeometry from "./EditGeometry/EditGeometry";
import { Modal } from "../../../components/Modal/Modal";

interface GeometryManagerProps {
  geometry: GeometryItem[];
  onGeometryChange: (geometry: GeometryItem[]) => void;
}

export const GeometryManager = ({
  geometry,
  onGeometryChange,
}:GeometryManagerProps) => {

  const [modals, setModals] = useState({
    addGeometry: false,
    editGeometry: false,
    deleteAllGeometry: false,
  });

  const [isUpdated, setIsUpdated] = useState<boolean>(false);

  const handleModals = (modalName: string, value: boolean) => {
    Object.keys(modals).forEach((key) => {
      if (key !== modalName) {
        setModals((prev) => ({ ...prev, [key]: false }));
      }
    });
    setModals((prev) => ({ ...prev, [modalName]: value }));
  };

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
          addGeometry={() => handleModals("addGeometry", true)} 
          editGeometry={() => handleModals("editGeometry", true)}
        />
      </div>

      <Modal 
        isOpen={modals.addGeometry}
        onClose={() => handleModals("addGeometry", false)}
      >
        <AddGeometry
          onSetGeometry={handleGeometryChange}
          onClose={() => handleModals("addGeometry", false)}
        />
      </Modal>
      <Modal
        isOpen={modals.editGeometry}
        onClose={() => handleModals("editGeometry", false)}
      >
        <EditGeometry
          initialPoints={geometry}
          onPointsChange={handleGeometryChange}
          onClose={() => handleModals("editGeometry", false)}
        />
      </Modal>
    </>
  );
};
