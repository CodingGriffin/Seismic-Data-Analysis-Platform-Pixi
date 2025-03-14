import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RecordItem } from "../../../../types/record";
import { Button } from "../../../../components/Button/Button";

interface SortableRecordRowProps {
  record: RecordItem;
  index: number;
  orderId: string;
  onDelete: (index: string) => void;
  onUpdate: (index: string) => void;
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
      <td className="align-middle cursor-move" {...listeners}>
        {orderId}
      </td>
      <td className="align-middle">
        {record.dimensions.width} x {record.dimensions.height}
      </td>
      <td className="align-middle">
        {record.min.toFixed(2)} to {record.max.toFixed(2)}
      </td>
      <td>
        <div className="d-flex gap-2">
          <Button
            variant="primary"
            onClick={() => onUpdate(orderId)}
            aria-label="Edit record"
          >
            Edit
          </Button>
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
