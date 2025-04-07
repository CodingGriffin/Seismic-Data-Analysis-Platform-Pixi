import { Button } from "../../../../components/Button/Button";

export default function RecordButton({
    recordsLength,
    isUpdated,
    addRecord,
    editRecord
}: {
    recordsLength: number,
    isUpdated: boolean,
    addRecord: () => void,
    editRecord: () => void,
}) {
    return (
        <div className="d-flex flex-column align-items-center gap-2 mt-3">
            <div className="d-flex justifify-content-center align-items-center">
                <h1 className="mb-0 text-center ">Records</h1>
                {isUpdated && <span className="badge bg-info ms-2">Updated</span>}
            </div>
            <span className="mb-0 text-secondary">
                {recordsLength > 0
                    ? `${recordsLength} Record available.`
                    : "No Records present."
                }
            </span>
            <Button
                variant="primary"
                className="w-auto ms-2 mb-0"
                style={{cursor: "pointer"}}
                onClick={(e) => {
                    e.preventDefault();
                    if (recordsLength > 0) {
                        editRecord();
                    } else {
                        addRecord();
                    }
                }}
            >
                {recordsLength > 0 ? "Edit Record" : "Add Record"}
            </Button>
        </div>
    );
}
