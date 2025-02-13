import { useState, useRef, type ChangeEvent, useEffect } from "react";
import * as XLSX from "xlsx";
import { getDataFromExcel } from "../utils/excelParse";
import { GeometryItem } from "../types";
interface AddGeometryProps {
  onSetGeometry: (data: any) => void;
  onClose: () => void;
}

interface SheetData {
  name: string;
  data: any[][];
}

export default function AddGeometry({
  onSetGeometry,
  onClose,
}: AddGeometryProps) {
  const [inputMethod, setInputMethod] = useState<"Spreadsheet" | "Text">(
    "Spreadsheet"
  );
  const [units, setUnits] = useState<"Meters" | "Feet">("Meters");
  const [geometryFormat, setGeometryFormat] = useState<"NXYZ" | "NZYX">("NXYZ");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [previewData, setPreviewData] = useState<GeometryItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedSheet && sheets.length > 0) {
      const selectedData = sheets.find((sheet) => sheet.name === selectedSheet);
      if (selectedData) {
        console.log("selectedData", selectedData);
        const parsedData: GeometryItem[] | null = getDataFromExcel(
          selectedData.data
        );
        setPreviewData(parsedData);
      }
    }
  }, [selectedSheet]);

  useEffect(() => {
    if (inputMethod === "Text") {
      setSheets([]);
      setSelectedSheet("");
      setPreviewData(null);
    }
  }, [inputMethod]);
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetData: SheetData[] = workbook.SheetNames.map((name) => ({
        name,
        data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }),
      }));
      setSheets(sheetData);
      const coordSheet = workbook.SheetNames.find((name) =>
        /^Station Coords - N X Y Z[\w+a-zA-Z0-9]*/.test(name)
      );

      if (coordSheet) {
        setSelectedSheet(coordSheet);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoadData = () => {
    const selectedData = sheets.find((sheet) => sheet.name === selectedSheet);
    if (selectedData) {
      const parsedData = getDataFromExcel(selectedData.data);
      if (!parsedData) return;
      onSetGeometry(parsedData);
      onClose();
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fs-4">Add Geometry</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label">Input Method:</label>
                <select
                  className="form-select"
                  value={inputMethod}
                  onChange={(e) =>
                    setInputMethod(e.target.value as "Spreadsheet" | "Text")
                  }
                >
                  <option value="Spreadsheet">Spreadsheet</option>
                  <option value="Text">Text</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label">Units:</label>
                <select
                  className="form-select"
                  value={units}
                  onChange={(e) =>
                    setUnits(e.target.value as "Meters" | "Feet")
                  }
                >
                  <option value="Meters">Meters</option>
                  <option value="Feet">Feet</option>
                </select>
              </div>
            </div>

            {inputMethod === "Spreadsheet" ? (
              <div className="mb-3">
                <input
                  type="file"
                  className="d-none"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
                <button
                  className="btn btn-primary w-100"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Spreadsheet
                </button>
              </div>
            ) : (
              <div className="col-12 d-flex justify-between align-items-center">
                <label className="form-label w-50">Geometry Format:</label>
                <select
                  className="form-select"
                  value={geometryFormat}
                  onChange={(e) =>
                    setGeometryFormat(e.target.value as "NXYZ" | "NZYX")
                  }
                >
                  <option value="NXYZ">NXYZ</option>
                  <option value="NZYX">NZYX</option>
                </select>
              </div>
            )}

            {inputMethod === "Spreadsheet" && sheets.length > 0 && (
              <div className="mb-3">
                <label className="form-label">Sheet:</label>
                <select
                  className="form-select"
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                  }}
                >
                  {sheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {inputMethod === "Spreadsheet" ? (
              <div
                className="border rounded p-3 mb-3 overflow-auto"
                style={{ minHeight: "200px", maxHeight: "200px" }}
              >
                {previewData && previewData.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-striped mb-0">
                      <tbody>
                        {previewData.map((data: any, i) => (
                          <tr key={i}>
                            {Object.keys(data).map((cell: any, j: number) => (
                              <td key={j}>{data[cell]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted">No Data</div>
                )}
              </div>
            ) : (
              <textarea
                className="form-control border rounded p-3 mb-3 overflow-auto"
                style={{ minHeight: "200px", maxHeight: "200px" }}
                rows={10}
                placeholder="Enter geometry data here..."
              ></textarea>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-primary w-100"
              onClick={handleLoadData}
              disabled={previewData === null}
            >
              Load Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
