import { Button } from "../../../../components/Button/Button";

export default function GeometryButton({
    geometryLength,
    isUpdated,
    addGeometry,
    editGeometry
}: {
    geometryLength: number,
    isUpdated: boolean,
    addGeometry: () => void,
    editGeometry: () => void,
}) {
    return (
        <div className="d-flex flex-column align-items-center gap-2 mt-3">
            <div className="d-flex justifify-content-center align-items-center">
                <h1 className="mb-0 text-center ">Geometry</h1>
                {isUpdated && <span className="badge bg-info ms-2">Updated</span>}
            </div>
            <span className="mb-0 text-secondary">
                {geometryLength > 0
                    ? `${geometryLength} points available.`
                    : "No geometry present."
                }
            </span>
            <Button
                variant="primary"
                className="w-auto ms-2 mb-0"
                style={{cursor: "pointer"}}
                onClick={(e) => {
                    e.preventDefault();
                    if (geometryLength > 0) {
                        editGeometry();
                    } else {
                        addGeometry();
                    }
                }}
            >
                {geometryLength > 0 ? "Edit Geometry" : "Add Geometry"}
            </Button>
        </div>
    );
}
