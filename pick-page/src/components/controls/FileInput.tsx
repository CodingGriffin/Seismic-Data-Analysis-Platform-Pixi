interface FileInputProps {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileInput({ label, onChange }: FileInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="file"
        accept=".npy"
        onChange={onChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
    </div>
  );
}

