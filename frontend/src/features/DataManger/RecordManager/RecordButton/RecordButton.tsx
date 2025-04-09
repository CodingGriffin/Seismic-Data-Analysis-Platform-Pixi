import { Button } from "../../../../components/Button/Button";

export default function RecordButton({
    recordOptionsLength,
    isUpdated,
    addRecordOptions,
    editRecordOptions
}: {
    recordOptionsLength: number,
    isUpdated: boolean,
    addRecordOptions: () => void,
    editRecordOptions: () => void,
}) {
    return (
        <div className="d-flex flex-column align-items-center gap-2 mt-3">
            <div className="d-flex justifify-content-center align-items-center">
                <h1 className="mb-0 text-center ">Records</h1>
                {isUpdated && <span className="badge bg-info ms-2">Updated</span>}
            </div>
            <span className="mb-0 text-secondary">
                {recordOptionsLength > 0
                    ? `${recordOptionsLength} Record available.`
                    : "No Records present."
                }
            </span>
            <Button
                variant="primary"
                className="w-auto ms-2 mb-0"
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                    e.preventDefault();
                    if (recordOptionsLength > 0) {
                        editRecordOptions();
                    } else {
                        addRecordOptions();
                    }
                }}
            >
                {recordOptionsLength > 0 ? "Edit Record" : "Add Record"}
            </Button>
        </div>
    );
}
