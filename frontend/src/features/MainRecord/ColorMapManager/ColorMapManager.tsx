import { useState, useEffect } from 'react';
import { Window } from '../../../types/index';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { setSelectedColorMap, updateColorMap } from '../../../store/slices/plotSlice';
import { Modal } from '../../../components/Modal/Modal';
import { Button } from '../../../components/Button/Button';
import { Input } from '../../../components/Input/Input';
import { ColorMapKey } from '../../../utils/record-util';

export const ColorMapManager = () => {

  const { colorMaps, selectedColorMap } = useAppSelector((state) => state.plot);
  const dispatch = useAppDispatch();
  const [editedColorMap, setEditedColorMap] = useState<string[]>([]);
  const [isOpen, setShowColorMapEditor] = useState<boolean>(false);

  const onClose = () => {
    setShowColorMapEditor(false);
  };

  useEffect(() => {
    if (isOpen) {
      setEditedColorMap([...colorMaps[selectedColorMap]]);
    }
  }, [isOpen, selectedColorMap, colorMaps]);

  const handleColorChange = (index: number, field: 'r' | 'g' | 'b' | 'stop', value: string) => {
    setEditedColorMap(prevMap => {
      const newMap = [...prevMap];
      const colorStop = newMap[index];
      const match = colorStop.match(/rgb\((\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*),\s*([\d.]+)\)/);
      if (!match) return prevMap;

      const [_, r, g, b, stop] = match;

      if (field === 'stop') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          const clampedValue = Math.max(0, Math.min(1, numValue));
          if (numValue === clampedValue) {
            const values = { r, g, b, stop: value };
            newMap[index] = `rgb(${values.r},${values.g},${values.b}, ${values.stop})`;
            return newMap;
          }
        }
        return prevMap;
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          const clampedValue = Math.max(0, Math.min(255, numValue));
          const values = { r, g, b, stop };
          values[field] = clampedValue.toString();
          newMap[index] = `rgb(${values.r},${values.g},${values.b}, ${values.stop})`;
          return newMap;
        }
        return prevMap;
      }
    });
  };

  const handleAddRow = () => {
    setEditedColorMap(prev => [...prev, 'rgb(255,255,255, 1.0)']);
  };

  const handleRemoveRow = (index: number) => {
    setEditedColorMap(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    dispatch(updateColorMap({ [selectedColorMap]: editedColorMap }));
    onClose();
  };

  const handleExport = () => {
    const colorMapDefinition = `'${selectedColorMap}': [\n${editedColorMap
      .map(color => `    '${color}'`)
      .join(',\n')}\n  ],`;

    const blob = new Blob([colorMapDefinition], { type: 'text/plain' });

    try {
      (window as unknown as Window)
        .showSaveFilePicker({
          suggestedName: `${selectedColorMap}_colormap.txt`,
          types: [
            {
              description: "Text Files",
              accept: {
                "text/plain": [".txt"],
              },
            },
          ],
        })
        .then(async (handle: any) => {
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        });
    } catch (err) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedColorMap}_colormap.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <>
      <div className="d-flex gap-3 w-full justify-content-between">
        <select
          value={selectedColorMap}
          onChange={(e) => dispatch(setSelectedColorMap(e.target.value as ColorMapKey))}
          className="form-select flex-grow"
        >
          {(Object.keys(colorMaps) as ColorMapKey[]).map(
            (mapName) => (
              <option key={mapName} value={mapName}>
                {mapName}
              </option>
            )
          )}
        </select>
        <Button
          variant="primary"
          onClick={() => setShowColorMapEditor(true)}
        >
          Edit
        </Button>
      </div>
      <Modal isOpen={isOpen} onClose={onClose} className="modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{`Edit Color Map: ${selectedColorMap}`}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className="container">
              <table className="table table-bordered">
                <thead>
                  <tr className="table-light">
                    <th>Red</th>
                    <th>Green</th>
                    <th>Blue</th>
                    <th>Stop Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedColorMap.map((colorStop, index) => {
                    const match = colorStop.match(/rgb\((\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*),\s*([\d.]+)\)/);
                    if (!match) return null;
                    return (
                      <tr key={index}>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            max="255"
                            step="any"
                            value={match[1]}
                            onChange={(value) => handleColorChange(index, 'r', value)}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            max="255"
                            step="any"
                            value={match[2]}
                            onChange={(value) => handleColorChange(index, 'g', value)}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            max="255"
                            step="any"
                            value={match[3]}
                            onChange={(value) => handleColorChange(index, 'b', value)}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.001"
                            value={match[4]}
                            onChange={(value) => handleColorChange(index, 'stop', value)}
                          />
                        </td>
                        <td>
                          <Button
                            variant="danger"
                            onClick={() => handleRemoveRow(index)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
          <div className="modal-footer d-flex justify-content-end gap-2 mt-3">
            <Button variant="primary" onClick={handleAddRow}>
              Add Color Stop
            </Button>
            <Button variant="success" onClick={handleExport}>
              Export
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
