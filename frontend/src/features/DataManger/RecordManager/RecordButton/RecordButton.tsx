import { Button } from "../../../../components/Button/Button";

export default function RecordButton({
    records,
    addRecord,
    editRecord
}: {
    records: string[],
    addRecord: () => void,
    editRecord: () => void,
}) {
    return (
        <div className="d-flex flex-column align-items-center justify-content-space-between h-100">
            <h2 className="mb-0 text-center">Record</h2>
            <span className="mb-0 text-secondary">
                {records.length > 0
                    ? `${records.length} Record available.`
                    : "No Records present."
                }
            </span>
            <Button
                variant="primary"
                className="w-auto ms-2 mb-0"
                style={{cursor: "pointer"}}
                onClick={(e) => {
                    e.preventDefault();
                    if (records.length > 0) {
                        editRecord();
                    } else {
                        addRecord();
                    }
                }}
            >
                {records.length > 0 ? "Edit Record" : "Add Record"}
            </Button>
        </div>
    );
}
