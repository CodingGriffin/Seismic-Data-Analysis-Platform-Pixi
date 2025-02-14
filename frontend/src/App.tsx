import { useEffect, useState } from "react";
import "./App.scss";
import GeometryButton from "./components/GeometryButton.tsx";
import { GeometryItem } from "./components/GeometryButton.tsx";
import AddGeometry from "./components/AddGeometry.tsx";
import GeometryEditor from "./components/EditGeometry.tsx";
function App() {
  const [geometry, setGeometry] = useState<GeometryItem[]>([]);
  const [showAddGeometry, setShowAddGeometry] = useState(false);
  
  const handleGeometryAdd = (data: { units: string; data: GeometryItem[] }) => {
    setGeometry(data.data);
    setShowAddGeometry(false);
  };

  useEffect(() => {
    console.log("geometry", geometry);
  }, [geometry]);

  return (
    // <>
    //   <div className="container mt-5">
    //     <GeometryButton 
    //       geometry={geometry} 
    //       addGeometry={() => setShowAddGeometry(true)} 
    //       editGeometry={() => {}}
    //     />
    //   </div>

    //   <div 
    //     className={`modal-backdrop fade ${showAddGeometry ? 'show' : ''}`} 
    //     style={{ display: showAddGeometry ? 'block' : 'none' }}
    //   />

    //   <div 
    //     className={`modal fade ${showAddGeometry ? 'show' : ''}`} 
    //     style={{ display: showAddGeometry ? 'block' : 'none' }}
    //     onClick={(e) => {
    //       if (e.target === e.currentTarget) {
    //         setShowAddGeometry(false);
    //       }
    //     }}
    //     tabIndex={-1}
    //     role="dialog"
    //     aria-modal="true"
    //   >
    //     <div className="modal-dialog">
    //       {showAddGeometry && (
    //         <AddGeometry
    //           onSetGeometry={handleGeometryAdd}
    //           onClose={() => setShowAddGeometry(false)}
    //         />
    //       )}
    //     </div>
    //   </div>
    // </>
    <GeometryEditor initialPoints={geometry} onPointsChange={(points) => setGeometry(points)} />
  );
}

export default App;
