import { useState, useRef, type ChangeEvent, useEffect } from "react";
import * as XLSX from "xlsx";
import { getDataFromExcel } from "../utils/excelParse";
import { extractGeometryFromSegy } from "../utils/segyParse";
import { GeometryItem } from "../types";

interface AddGeometryProps {
  onSetGeometry: (data: any) => void;
  onClose: () => void;
}

interface SheetData {
  name: string;
  data: any[][];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export default function AddGeometry({
  onSetGeometry,
  onClose,
}: AddGeometryProps) {
  const [inputMethod, setInputMethod] = useState<
    "Spreadsheet" | "Text" | "Array" | "SGY"
  >("Spreadsheet");
  const [units, setUnits] = useState<"Meters" | "Feet">("Meters");
  const [geometryFormat, setGeometryFormat] = useState<"NXYZ" | "NZYX">("NXYZ");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [previewData, setPreviewData] = useState<GeometryItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sgyFileInputRef = useRef<HTMLInputElement>(null);
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [text, setText] = useState<string>(() => matrixToText(matrix));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [numberOfPoints, setNumberOfPoints] = useState<number>(5);
  const [spacing, setSpacing] = useState<number>(8);

  useEffect(() => {
    if (selectedSheet && sheets.length > 0) {
      const selectedData = sheets.find((sheet) => sheet.name === selectedSheet);
      if (selectedData) {
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

  function matrixToText(matrix: number[][]) {
    return matrix
      .map((row) => row.map((num) => num.toString().padEnd(6)).join(" "))
      .join("\n");
  }

  function validateMatrix(matrix: number[][]): ValidationResult {
    const errors: string[] = [];

    // Check if matrix is empty
    if (matrix.length === 0) {
      errors.push("Matrix cannot be empty");
      return { isValid: false, errors };
    }

    // Check if all rows have the same number of columns
    const expectedColumns = geometryFormat === "NXYZ" ? 4 : 4; // Adjust based on format
    const hasInvalidRows = matrix.some((row) => row.length !== expectedColumns);
    if (hasInvalidRows) {
      errors.push(`Each row must have exactly ${expectedColumns} columns`);
    }

    // Check if first column (N) is sequential
    for (let i = 1; i < matrix.length; i++) {
      if (matrix[i][0] !== matrix[i - 1][0] + 1) {
        errors.push("First column (N) must be sequential");
        break;
      }
    }

    // Validate number ranges based on units
    const maxElevation = units === "Meters" ? 10000 : 30000; // Example limits
    const maxCoordinate = units === "Meters" ? 100000 : 300000;

    for (const row of matrix) {
      // Check X coordinate (or Z for NZYX format)
      if (Math.abs(row[1]) > maxCoordinate) {
        errors.push(
          `Coordinate values must be within ±${maxCoordinate} ${units}`
        );
        break;
      }

      // Check Y coordinate
      if (Math.abs(row[2]) > maxCoordinate) {
        errors.push(
          `Coordinate values must be within ±${maxCoordinate} ${units}`
        );
        break;
      }

      // Check elevation (Z or X depending on format)
      if (row[3] < 0 || row[3] > maxElevation) {
        errors.push(`Elevation must be between 0 and ${maxElevation} ${units}`);
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  const handleBlur = () => {
    const validation = validateMatrix(matrix);
    setValidationErrors(validation.errors);

    if (validation.isValid) {
      setText(matrixToText(matrix));
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);

    try {
      const newMatrix = newText
        .trim()
        .split("\n")
        .map((row) =>
          row
            .trim()
            .split(/[\s,]+/)
            .map((num) => parseFloat(num))
            .filter((num) => !isNaN(num))
        )
        .filter((row) => row.length > 0);

      const validation = validateMatrix(newMatrix);
      setValidationErrors(validation.errors);

      if (validation.isValid) {
        setMatrix(newMatrix);
      }
    } catch (error) {
      setValidationErrors(["Invalid data format"]);
    }
  };
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

  const handleSgyFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) return;
      const arrayBuffer = e.target.result as ArrayBuffer;
      
      // Extract geometry from SEG-Y file
      const geometry = extractGeometryFromSegy(arrayBuffer);
      console.log(geometry)
      // Update state with the geometry data
      onSetGeometry({ units, data: geometry });
      onClose();
    };

    reader.readAsArrayBuffer(file);
  };

  const handleLoadData = () => {
    if (inputMethod === "Text") {
      const validation = validateMatrix(matrix);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      // Transform matrix data to match GeometryItem interface
      const geometryData: GeometryItem[] = matrix.map((row, index) => ({
        index: index + 1, // Add required index field
        x: geometryFormat === "NXYZ" ? row[1] : row[3],
        y: row[2],
        z: geometryFormat === "NXYZ" ? row[3] : row[1],
      }));

      onSetGeometry({ units, data: geometryData }); // Match GeometryArray interface
      onClose();
    } else {
      const selectedData = sheets.find((sheet) => sheet.name === selectedSheet);
      if (selectedData) {
        const parsedData = getDataFromExcel(selectedData.data);
        if (!parsedData) return;
        onSetGeometry({ units, data: parsedData }); // Match GeometryArray interface
        onClose();
      }
    }
  };

  const generateArrayGeometry = () => {
    const geometryData: GeometryItem[] = Array.from(
      { length: numberOfPoints },
      (_, i) => ({
        index: i + 1,
        x: i * spacing,
        y: 0,
        z: 0,
      })
    );

    onSetGeometry({ units, data: geometryData });
    onClose();
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
                    setInputMethod(
                      e.target.value as "Spreadsheet" | "Text" | "Array" | "SGY"
                    )
                  }
                >
                  <option value="Spreadsheet">Spreadsheet</option>
                  <option value="Text">Text</option>
                  <option value="Array">Array</option>
                  <option value="SGY">SGY File</option>
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

            {inputMethod === "Spreadsheet" && (
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
            )}

            {inputMethod === "SGY" && (
              <div className="mb-3">
                <input
                  type="file"
                  className="d-none"
                  ref={sgyFileInputRef}
                  accept=".sgy"
                  onChange={handleSgyFileUpload}
                />
                <button
                  className="btn btn-primary w-100"
                  onClick={() => sgyFileInputRef.current?.click()}
                >
                  Upload Sgy
                </button>
              </div>
            )}

            {inputMethod === "Text" && (
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

            {inputMethod === "Spreadsheet" && (
              <div
                className="border rounded p-3 mb-3 mt-3 overflow-auto"
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
            )}
            {inputMethod === "Text" && (
              <>
                <textarea
                  className={`form-control border rounded p-3 mb-3 mt-3 overflow-auto ${
                    validationErrors.length > 0 ? "is-invalid" : ""
                  }`}
                  style={{
                    minHeight: "200px",
                    maxHeight: "200px",
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                  }}
                  value={text}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Paste Geometry here..."
                />
                {validationErrors.length > 0 && (
                  <div className="invalid-feedback d-block">
                    {validationErrors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                )}
              </>
            )}

            {inputMethod === "Array" && (
              <div className="mb-3">
                <div className="d-flex justify-content-between gap-3">
                  <div className="mb-2 w-1/2">
                    <label className="form-label">Number of Points</label>
                    <input
                      type="number"
                      className="form-control"
                      min="2"
                      value={numberOfPoints}
                      onChange={(e) =>
                        setNumberOfPoints(
                          Math.max(2, parseInt(e.target.value) || 2)
                        )
                      }
                    />
                  </div>
                  <div className="mb-2 w-1/2">
                    <label className="form-label">Spacing ({units})</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0.1"
                      step="0.1"
                      value={spacing}
                      onChange={(e) =>
                        setSpacing(
                          Math.max(0.1, parseFloat(e.target.value) || 0.1)
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-primary w-100"
              onClick={
                inputMethod === "Array" ? generateArrayGeometry : handleLoadData
              }
              disabled={
                (inputMethod === "Text" &&
                  (!matrix.length || validationErrors.length > 0)) ||
                (inputMethod === "Spreadsheet" && !previewData) ||
                (inputMethod === "Array" && numberOfPoints < 2)
              }
            >
              Load Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
