interface FileControlsProps {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  showDownload?: boolean;
  onDownload?: () => void;
}

export const FileControls = ({ onFileSelect, onDownload = () => {}, accept = ".txt",showDownload = true }: FileControlsProps) => {
  return (
    <div className="flex justify-center gap-4">
      <input
        type="file"
        accept={accept}
        onChange={onFileSelect}
        className="block w-full text-sm text-gray-500 mb-4
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
      />
      {showDownload && (
      <button
        onClick={onDownload}
        className="px-4 py-0 bg-blue-50 text-sm border-0 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
      >
        Download
      </button>
      )}
    </div>
  );
};
