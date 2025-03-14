import { GeometryItem } from "../../../../types/geometry";
import { Button } from "../../../../components/Button/Button";

export default function GeometryButton({
    geometry,
    addGeometry,
    editGeometry
}: {
    geometry: GeometryItem[],
    addGeometry: () => void,
    editGeometry: () => void,
}) {
    return (
        <div className="d-flex flex-column align-items-center justify-content-space-between h-100">
            <h2 className="mb-0 text-center">Geometry</h2>
            <span className="mb-0 text-secondary">
                {geometry.length > 0
                    ? `${geometry.length} points available.`
                    : "No geometry present."
                }
            </span>
            <Button
                variant="primary"
                className="w-auto ms-2 mb-0"
                style={{cursor: "pointer"}}
                onClick={(e) => {
                    e.preventDefault();
                    if (geometry.length > 0) {
                        editGeometry();
                    } else {
                        addGeometry();
                    }
                }}
            >
                {geometry.length > 0 ? "Edit Geometry" : "Add Geometry"}
            </Button>
        </div>
    );
}
