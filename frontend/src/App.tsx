import { useEffect, useState } from "react";
import "./App.scss";
import GeometryButton from "./components/GeometryButton";
import { GeometryItem } from "./types";
import AddGeometry from "./components/AddGeometry";
import GeometryEditor from "./components/EditGeometry";
function App() {
  const [geometry, setGeometry] = useState<GeometryItem[]>([]);
  const [showAddGeometry, setShowAddGeometry] = useState(false);
  const [showEditGeometry, setShowEditGeometry] = useState(false);

  const handleGeometryAdd = (data: { units: string; data: GeometryItem[] }) => {
    setGeometry(data.data);
    setShowAddGeometry(false);
  };

  const handleGeometryEdit = (data: GeometryItem[]) => {
    setGeometry(data);
  };
  
  useEffect(() => {
    console.log("Geometry:", geometry)
  }, [geometry])
  
  return (
    <>
      <div className="container mt-5">
        <GeometryButton 
          geometry={geometry} 
          addGeometry={() => setShowAddGeometry(true)} 
          editGeometry={() => setShowEditGeometry(true)}
        />
      </div>

      {(showAddGeometry || showEditGeometry) && (
        <>
          <div className="modal-backdrop show" />
          <div className="modal show d-block">
            <div className="modal-dialog geometry-modal">
              {showAddGeometry && (
                <AddGeometry
                  onSetGeometry={handleGeometryAdd}
                  onClose={() => setShowAddGeometry(false)}
                />
              )}
              {showEditGeometry && (
                <GeometryEditor 
                  initialPoints={geometry} 
                  onPointsChange={handleGeometryEdit}
                  onClose={() => setShowEditGeometry(false)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default App;
