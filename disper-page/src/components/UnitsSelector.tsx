import { useDisper } from '../context/DisperContext';

interface UnitsSelectorProps {
  className?: string;
}

export default function UnitsSelector({ className = '' }: UnitsSelectorProps) {
  const { displayUnits, setDisplayUnits } = useDisper();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-600">Units:</label>
      <select
        value={displayUnits}
        onChange={(e) => setDisplayUnits(e.target.value as 'm' | 'ft')}
        className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
      >
        <option value="m">Meters</option>
        <option value="ft">Feet</option>
      </select>
    </div>
  );
}