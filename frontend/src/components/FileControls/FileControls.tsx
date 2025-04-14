interface FileControlsProps {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  showDownload?: boolean;
  onDownload?: () => void;
  multiple?: boolean;
}

export const FileControls = ({
  onFileSelect,
  onDownload = () => {},
  accept = ".txt",
  showDownload = true,
  multiple = false,
}: FileControlsProps) => {
  return (
    <div className="d-flex justify-content-between w-100 gap-4">
      <div className="form-group flex-grow-1">
        <input
          type="file"
          accept={accept}
          onChange={onFileSelect}
          className="form-control"
          multiple={multiple}
        />
      </div>
      {showDownload && (
        <button
          onClick={onDownload}
          className="btn btn-primary"
        >
          Download
        </button>
      )}
    </div>
  );
};
