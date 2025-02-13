import os
import re
import pandas as pd


def get_data_from_excel(excel_path):
    xf = pd.ExcelFile(excel_path)
    sheet_names = xf.sheet_names
    sheet_name_regex = re.compile("^Station Coords - N X Y Z[w+a-zA-Z0-9]*")
    candidate_sheet_names = [x for x in sheet_names if sheet_name_regex.search(x)]
    sheet_name = None
    if len(candidate_sheet_names) == 0:
        raise ValueError("No valid sheet names found.")
    elif len(candidate_sheet_names) >= 1:
        sheet_name = candidate_sheet_names[0]
    df = xf.parse(sheet_name=sheet_name, header=2)
    headers = df.columns.values.tolist()
    if headers[0] != "Phone":
        raise ValueError("Headers do not match expected value.")
    x_header = headers[1]
    y_header = headers[2]
    z_header = headers[3]
    x_points = df[x_header]
    y_points = df[y_header]
    z_points = df[z_header]
    return x_points, y_points, z_points


def get_geometry_from_excel(excel_path):
    # Get raw points
    x_points, y_points, z_points = get_data_from_excel(excel_path)

    # Format as list of dicts for return
    return [
        {
            "index": idx,
            "x": float(x_points[idx]),
            "y": float(y_points[idx]),
            "z": float(z_points[idx]),
        } for idx in range(len(x_points))
    ]


def close_and_remove_file(path: str):
    def local_close():
        os.remove(path)

    return local_close
