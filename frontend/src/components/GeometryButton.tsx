import * as React from "react";
import axios from "axios";

export interface GeometryItem {
    index: number,
    x: number,
    y: number,
    z: number,
}

export interface GeometryArray {
    units: string,
    data: GeometryItem[]
}

export default function GeometryButton({
                                           geometry, setGeometry
                                       }: {
    geometry: GeometryItem[],
    setGeometry: React.Dispatch<React.SetStateAction<GeometryItem[]>>
}) {
    const backend_url = import.meta.env.VITE_BACKEND_URL
    const handleExcelUpload = async (e) => {
        const filesArray = Array.from(e.target.files)
        const config = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
                "Access-Control-Allow-Headers": "X-Requested-With",
            }
        }
        filesArray.forEach((file) => {
            console.log(backend_url + '/extractExcel')
            const formData = new FormData();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            formData.append("excel_file", file)
            axios.post(
                backend_url + '/extractExcel',
                formData,
                config
            ).catch(error => {
                console.log("Error occurred checking record.")
                console.log(error)
            }).then(response => {
                if (response === undefined || response === null) {
                    console.log("Error: Response is undefined")
                } else if (response.status < 200 || response.status > 299) {
                    console.log("Error: Got unsuccessful response.")
                    console.log(response.status)
                } else {
                    setGeometry(response.data)
                }
            })
        })

    }
    console.log(backend_url)
    return (
        <div className="d-flex flex-column align-items-center">
            <h2 className="mb-0 text-center">Geometry</h2>
            <span className="mb-0 text-secondary">
                {geometry.length > 0
                    ? `${geometry.length} points available.`
                    : "No geometry present."
                }
            </span>
            <label
                htmlFor="geometry-excel-files"
                className="btn btn-primary w-auto ms-2 mb-0"
                style={{cursor: "pointer"}}
                onClick={(e) => {
                    if (geometry.length > 0) {
                        e.preventDefault(); //necessary to include since we don't want the file explorer to pop up over the dialog every time
                    }
                }}
            >
                {geometry.length > 0 ? "Edit Geometry" : "Add Geometry"}
            </label>
            <input
                type="file"
                className={`form-control-file w-75 mt-2`}
                name="geometry_excel_file_input"
                id="geometry-excel-files"
                accept=".xls,.xlsx"
                multiple
                required
                onChange={handleExcelUpload}
                style={{display: "none"}} //need to hide default file input button to do required styling
            />

        </div>
    )
}