import { useEffect } from "react";
import { GeometryItem } from "../../../types/geometry";
import GeometryButton from "./GeometryButton/GeometryButton";
import AddGeometry from "./AddGeometry/AddGeometry";
import GeometryEditor from "./EditGeometry/EditGeometry";
import { Modal } from "../../../components/Modal/Modal";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { setGeometry, setShowAddGeometry, setShowEditGeometry } from "../../../store/slices/geometrySlice";

export const GeometryManager = () => {
  const dispatch = useAppDispatch();
  const { items: geometry, showAddGeometry, showEditGeometry } = useAppSelector(
    (state) => state.geometry
  );

  const handleGeometryAdd = (data: { units: string; data: GeometryItem[] }) => {
    dispatch(setGeometry(data.data));
    dispatch(setShowAddGeometry(false));
  };

  const handleGeometryEdit = (data: GeometryItem[]) => {
    dispatch(setGeometry(data));
  };
  
  useEffect(() => {
    console.log("Geometry:", geometry);
  }, [geometry]);
  
  return (
    <>
      <div className="container mt-5 flex-1">
        <GeometryButton 
          geometry={geometry} 
          addGeometry={() => dispatch(setShowAddGeometry(true))} 
          editGeometry={() => dispatch(setShowEditGeometry(true))}
        />
      </div>

      <Modal 
        isOpen={showAddGeometry || showEditGeometry}
        onClose={() => {
          dispatch(setShowAddGeometry(false));
          dispatch(setShowEditGeometry(false));
        }}
        className="geometry-modal"
      >
        {showAddGeometry && (
          <AddGeometry
            onSetGeometry={handleGeometryAdd}
            onClose={() => dispatch(setShowAddGeometry(false))}
          />
        )}
        {showEditGeometry && (
          <GeometryEditor
            initialPoints={geometry}
            onPointsChange={handleGeometryEdit}
            onClose={() => dispatch(setShowEditGeometry(false))}
          />
        )}
      </Modal>
    </>
  );
};
