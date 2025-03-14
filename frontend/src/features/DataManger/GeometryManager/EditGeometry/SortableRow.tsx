import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GeometryItem } from "../../../../types/geometry";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";

interface SortableRowProps {
  point: GeometryItem;
  index: number;
  onDelete: (index: number) => void;
  onPointChange: (index: number, field: keyof GeometryItem, value: number) => void;
}

export function SortableRow({ point, index, onDelete, onPointChange }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: point.index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td className="align-middle cursor-move" {...listeners}>
        {point.index}
      </td>
      <td>
        <Input
          type="number"
          value={point.x}
          onChange={(value) => onPointChange(index, "x", Number(value))}
        />
      </td>
      <td>
        <Input
          type="number"
          value={point.y}
          onChange={(value) => onPointChange(index, "y", Number(value))}
        />
      </td>
      <td>
        <Input
          type="number"
          value={point.z}
          onChange={(value) => onPointChange(index, "z", Number(value))}
        />
      </td>
      <td>
        <Button
          variant="danger"
          onClick={() => onDelete(point.index)}
          aria-label="Delete point"
        >
          Delete
        </Button>
      </td>
    </tr>
  );
}