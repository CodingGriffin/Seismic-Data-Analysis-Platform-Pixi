import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RecordItem } from "../../../../types/record";
import { Button } from "../../../../components/Button/Button";
import { Input } from "../../../../components/Input/Input";

interface SortableRecordRowProps {
  record: RecordItem;
  index: number;
  orderId: string;
  onDelete: (index: string) => void;
  onUpdate: (index: string, data: RecordItem | null) => void;
}

export function SortableRecordRow({
  record,
  index,
  orderId,
  onDelete,
  onUpdate,
}: SortableRecordRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td className="align-middle">
        <Button
          variant="primary"
          onClick={() => onUpdate(orderId, null)}
          aria-label="Edit record"
        >
          {record.fileName}
        </Button>
      </td>
      <td className="align-middle">
        <input
          className="form-check-input"
          type="checkbox"
          value={record.enabled ? 1 : 0}
          checked={record.enabled}
          onChange={(event) => {
            console.log("curValue:", event.target.checked);
            onUpdate(orderId, {
              ...record,
              enabled: event.target.checked,
            });
          }}
          aria-label="enable"
        />
        <label className="form-check-label" htmlFor="flexCheck">
          {record.enabled ? "Yes" : "No"}
        </label>
      </td>
      <td className="align-middle">
        <Input
          type="number"
          value={record.weight}
          onChange={(value) =>
            onUpdate(orderId, {
              ...record,
              weight: parseFloat(value),
            })
          }
        />
      </td>
      <td>
        <div className="d-flex gap-2">
          <Button
            variant="danger"
            onClick={() => onDelete(orderId)}
            aria-label="Delete record"
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
