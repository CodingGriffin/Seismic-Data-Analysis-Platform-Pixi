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
                                           geometry, addGeometry, editGeometry
                                       }: {
    geometry: GeometryItem[],
    addGeometry: () => void,
    editGeometry: () => void,
}) {
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
                onClick={(e:any) =>{
                    e.preventDefault();
                    if (geometry.length > 0) {
                        editGeometry();
                    } else {
                        addGeometry();
                    }
                }}
            >
                {geometry.length > 0 ? "Edit Geometry" : "Add Geometry"}
            </label>
        </div>
    )
}