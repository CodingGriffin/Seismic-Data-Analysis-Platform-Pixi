interface FileControlsProps {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  showDownload?: boolean;
  onDownload?: () => void;
}

export const FileControls = ({ onFileSelect, onDownload = () => {}, accept = ".txt", showDownload = true }: FileControlsProps) => {
  return (
    <div className="d-flex justify-content-center gap-3 mb-3">
      <div className="form-group flex-grow-1">
        <input
          type="file"
          accept={accept}
          onChange={onFileSelect}
          className="form-control"
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
