import React, { useState, useEffect } from 'react';
import { useNpyViewer } from '../../context/NpyViewerContext';

interface ColorMapEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ColorMapEditor: React.FC<ColorMapEditorProps> = ({ isOpen, onClose }) => {
  const { state: { colorMaps, selectedColorMap }, updateColorMap } = useNpyViewer();
  const [editedColorMap, setEditedColorMap] = useState<string[]>([]);

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
        // For stop values, preserve the exact string input as long as it's a valid number
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          const clampedValue = Math.max(0, Math.min(1, numValue));
          if (numValue === clampedValue) {
            const values = { r, g, b, stop: value }; // Use the original string value
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
    updateColorMap(selectedColorMap, editedColorMap);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">Edit Color Map: {selectedColorMap}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
        <div className="p-4 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border">Red</th>
                <th className="p-2 border">Green</th>
                <th className="p-2 border">Blue</th>
                <th className="p-2 border">Stop Value</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {editedColorMap.map((colorStop, index) => {
                const match = colorStop.match(/rgb\((\d+\.?\d*),(\d+\.?\d*),(\d+\.?\d*),\s*([\d.]+)\)/);
                if (!match) return null;
                return (
                  <tr key={index}>
                    <td className="p-2 border">
                      <input
                        type="number"
                        min="0"
                        max="255"
                        step="any" 
                        className="w-full p-1 border rounded"
                        value={match[1]}
                        onChange={(e) => handleColorChange(index, 'r', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        min="0"
                        max="255"
                        step="any" 
                        className="w-full p-1 border rounded"
                        value={match[2]}
                        onChange={(e) => handleColorChange(index, 'g', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        min="0"
                        max="255"
                        step="any" 
                        className="w-full p-1 border rounded"
                        value={match[3]}
                        onChange={(e) => handleColorChange(index, 'b', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.001" // Provide finer control over decimals
                        className="w-full p-1 border rounded"
                        value={match[4]}
                        onChange={(e) => handleColorChange(index, 'stop', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border">
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            onClick={handleAddRow}
            className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100"
          >
            + Add Row
          </button>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};